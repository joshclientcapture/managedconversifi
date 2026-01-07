import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse optional access_token from request body for single-client sync
    let targetAccessToken: string | null = null;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        targetAccessToken = body.access_token || null;
      } catch {
        // No body or invalid JSON, sync all
      }
    }

    console.log('Starting campaign stats sync...', targetAccessToken ? `for ${targetAccessToken}` : 'for all');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const apiKey = Deno.env.get('CONVERSIFI_API_KEY');

    if (!apiKey) {
      console.error('CONVERSIFI_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Conversifi API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query for client connections
    let query = supabase
      .from('client_connections')
      .select('id, client_name, access_token, conversifi_webhook_url')
      .eq('is_active', true)
      .not('conversifi_webhook_url', 'is', null);

    // Filter by access_token if provided
    if (targetAccessToken) {
      query = query.eq('access_token', targetAccessToken);
    }

    const { data: connections, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching connections:', fetchError);
      throw fetchError;
    }

    if (!connections || connections.length === 0) {
      const message = targetAccessToken 
        ? 'Connection not found or has no Conversifi webhook configured'
        : 'No active connections with Conversifi webhooks found';
      console.log(message);
      return new Response(
        JSON.stringify({ success: false, error: message, synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${connections.length} connections to sync`);

    const results = [];
    const today = new Date().toISOString().split('T')[0];

    for (const connection of connections) {
      try {
        console.log(`Fetching stats for ${connection.client_name} (${connection.access_token})`);

        // Call Conversifi webhook URL with GET request and API key
        const response = await fetch(connection.conversifi_webhook_url, {
          method: 'GET',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Conversifi API error for ${connection.client_name}:`, errorText);
          results.push({
            client: connection.client_name,
            access_token: connection.access_token,
            success: false,
            error: `API error: ${response.status}`
          });
          continue;
        }

        const responseData = await response.json();
        console.log(`Received stats for ${connection.client_name}:`, JSON.stringify(responseData).slice(0, 500));

        // Parse NEW Conversifi response format with periods:
        // { status: 200, data: { success: true, data: { campaigns: [...], totals: {...} } } }
        // Each campaign has periods: { all_time: {...}, last_7_days: {...}, last_14_days: {...}, last_30_days: {...} }
        const statsData = responseData?.data?.data || responseData?.data || responseData;
        const campaigns = statsData?.campaigns || [];
        const totals = statsData?.totals || {};

        // Use all_time totals for the main stats columns
        const allTimeTotals = totals.all_time || totals || {};

        // Calculate aggregated stats from all_time totals
        const totalProspects = allTimeTotals.total_prospects || 0;
        const totalSent = allTimeTotals.total_sent || 0;
        const totalResponses = allTimeTotals.total_responses || 0;
        const connectionsMade = allTimeTotals.connections_accepted || 0;
        const pendingRequests = totalSent - connectionsMade > 0 ? totalSent - connectionsMade : 0;
        const acceptanceRate = allTimeTotals.acceptance_rate || 0;
        const responseRate = allTimeTotals.response_rate || 0;

        // Calculate messages sent (inmails + follow-up messages) from campaigns
        let messagesSent = 0;
        for (const campaign of campaigns) {
          const allTimeStats = campaign?.periods?.all_time?.stats || campaign?.stats || {};
          messagesSent += (allTimeStats.inmails_sent || 0) + (allTimeStats.messages_sent || 0);
        }

        // If no campaign period data, try totals
        if (messagesSent === 0 && allTimeTotals.inmails_sent) {
          messagesSent = allTimeTotals.inmails_sent;
        }

        const stats = {
          messages_sent: messagesSent,
          replies_received: totalResponses,
          connections_made: connectionsMade,
          meetings_booked: allTimeTotals.meetings_booked || 0,
          total_prospects: totalProspects,
          total_sent: totalSent,
          total_responses: totalResponses,
          pending_requests: pendingRequests,
          acceptance_rate: acceptanceRate,
          response_rate: responseRate,
        };

        // Upsert campaign stats for today with full data including periods
        const { error: upsertError } = await supabase
          .from('campaign_stats')
          .upsert({
            client_connection_id: connection.id,
            access_token: connection.access_token,
            date: today,
            messages_sent: stats.messages_sent,
            replies_received: stats.replies_received,
            connections_made: stats.connections_made,
            meetings_booked: stats.meetings_booked,
            total_prospects: stats.total_prospects,
            total_sent: stats.total_sent,
            total_responses: stats.total_responses,
            pending_requests: stats.pending_requests,
            acceptance_rate: stats.acceptance_rate,
            response_rate: stats.response_rate,
            campaign_data: {
              campaigns: campaigns,
              totals: totals,
              synced_at: new Date().toISOString()
            }
          }, {
            onConflict: 'client_connection_id,date'
          });

        if (upsertError) {
          console.error(`Database error for ${connection.client_name}:`, upsertError);
          results.push({
            client: connection.client_name,
            access_token: connection.access_token,
            success: false,
            error: upsertError.message
          });
        } else {
          console.log(`Successfully synced stats for ${connection.client_name}`);
          results.push({
            client: connection.client_name,
            access_token: connection.access_token,
            success: true,
            stats,
            periods: Object.keys(totals)
          });
        }

      } catch (clientError) {
        console.error(`Error syncing ${connection.client_name}:`, clientError);
        results.push({
          client: connection.client_name,
          access_token: connection.access_token,
          success: false,
          error: String(clientError)
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Sync complete. ${successCount}/${connections.length} successful`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${successCount}/${connections.length} connections`,
        synced: successCount,
        total: connections.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
