import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting campaign stats sync...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active client connections with Conversifi webhooks
    const { data: connections, error: fetchError } = await supabase
      .from('client_connections')
      .select('id, client_name, conversifi_webhook_url')
      .eq('is_active', true)
      .not('conversifi_webhook_url', 'is', null);

    if (fetchError) {
      console.error('Error fetching connections:', fetchError);
      throw fetchError;
    }

    if (!connections || connections.length === 0) {
      console.log('No active connections with Conversifi webhooks found');
      return new Response(
        JSON.stringify({ success: true, message: 'No connections to sync', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${connections.length} connections to sync`);

    const results = [];
    const today = new Date().toISOString().split('T')[0];

    for (const connection of connections) {
      try {
        console.log(`Fetching stats for ${connection.client_name} from ${connection.conversifi_webhook_url}`);

        const apiKey = Deno.env.get('CONVERSIFI_API_KEY');
        
        // Call Conversifi webhook URL with GET request
        const response = await fetch(connection.conversifi_webhook_url, {
          method: 'GET',
          headers: {
            'X-API-Key': apiKey || '',
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Conversifi API error for ${connection.client_name}:`, errorText);
          results.push({
            client: connection.client_name,
            success: false,
            error: `API error: ${response.status}`
          });
          continue;
        }

        const statsData = await response.json();
        console.log(`Received stats for ${connection.client_name}:`, JSON.stringify(statsData).slice(0, 200));

        // Extract stats from response (adjust based on actual Conversifi API response structure)
        const stats = {
          messages_sent: statsData.messages_sent || statsData.messagesSent || 0,
          replies_received: statsData.replies_received || statsData.repliesReceived || 0,
          connections_made: statsData.connections_made || statsData.connectionsMade || 0,
          meetings_booked: statsData.meetings_booked || statsData.meetingsBooked || 0,
        };

        // Upsert campaign stats for today
        const { error: upsertError } = await supabase
          .from('campaign_stats')
          .upsert({
            client_connection_id: connection.id,
            date: today,
            messages_sent: stats.messages_sent,
            replies_received: stats.replies_received,
            connections_made: stats.connections_made,
            meetings_booked: stats.meetings_booked,
            campaign_data: statsData
          }, {
            onConflict: 'client_connection_id,date'
          });

        if (upsertError) {
          console.error(`Database error for ${connection.client_name}:`, upsertError);
          results.push({
            client: connection.client_name,
            success: false,
            error: upsertError.message
          });
        } else {
          console.log(`Successfully synced stats for ${connection.client_name}`);
          results.push({
            client: connection.client_name,
            success: true,
            stats
          });
        }

      } catch (clientError) {
        console.error(`Error syncing ${connection.client_name}:`, clientError);
        results.push({
          client: connection.client_name,
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
