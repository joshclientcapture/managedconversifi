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

        // Parse Conversifi response format:
        // { status: 200, data: { success: true, data: { campaigns: [...], totals: {...} } } }
        const statsData = responseData?.data?.data || responseData?.data || responseData;
        const campaigns = statsData?.campaigns || [];
        const totals = statsData?.totals || {};

        // Calculate aggregated stats from campaigns
        let totalProspects = totals.total_prospects || 0;
        let totalSent = totals.total_sent || 0;
        let totalResponses = totals.total_responses || 0;
        let totalConnectionsMade = 0;
        let totalPendingRequests = 0;
        let avgAcceptanceRate = 0;
        let avgResponseRate = 0;

        if (campaigns.length > 0) {
          for (const campaign of campaigns) {
            const stats = campaign.stats || {};
            totalConnectionsMade += stats.connections_accepted || 0;
            totalPendingRequests += stats.pending_requests || 0;
          }
          // Calculate average rates
          const rates = campaigns.map((c: any) => c.stats || {});
          avgAcceptanceRate = rates.reduce((sum: number, s: any) => sum + (s.acceptance_rate || 0), 0) / campaigns.length;
          avgResponseRate = rates.reduce((sum: number, s: any) => sum + (s.response_rate || 0), 0) / campaigns.length;
        }

        // Fallback for old response format
        const stats = {
          messages_sent: totalSent || responseData.messages_sent || responseData.messagesSent || 0,
          replies_received: totalResponses || responseData.replies_received || responseData.repliesReceived || 0,
          connections_made: totalConnectionsMade || responseData.connections_made || responseData.connectionsMade || 0,
          meetings_booked: responseData.meetings_booked || responseData.meetingsBooked || 0,
          total_prospects: totalProspects,
          total_sent: totalSent,
          total_responses: totalResponses,
          pending_requests: totalPendingRequests,
          acceptance_rate: avgAcceptanceRate,
          response_rate: avgResponseRate,
        };

        // Upsert campaign stats for today with full data
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
            campaign_data: statsData // Store full response for detailed view
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
            stats
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
