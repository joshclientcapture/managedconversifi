import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { access_token } = await req.json();

    if (!access_token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching dashboard data for access token:', access_token);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find client connection by access token
    const { data: connection, error: connError } = await supabase
      .from('client_connections')
      .select('*')
      .eq('access_token', access_token)
      .single();

    if (connError || !connection) {
      console.error('Connection not found:', connError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid access token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch campaign stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: campaignStats, error: statsError } = await supabase
      .from('campaign_stats')
      .select('*')
      .eq('client_connection_id', connection.id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (statsError) {
      console.warn('Error fetching campaign stats:', statsError);
    }

    // Fetch all bookings for this client
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('client_connection_id', connection.id)
      .order('event_time', { ascending: false });

    if (bookingsError) {
      console.warn('Error fetching bookings:', bookingsError);
    }

    // Note: We intentionally do NOT mutate event_status for past meetings here.
    // The dashboard UI will display past scheduled meetings as "Awaiting Feedback"
    // until the user marks attendance / outcome.

    // Get latest stats for summary
    const latestStats = campaignStats?.[0] || null;
    
    // Count all bookings (including canceled)
    const actualMeetingsBooked = (bookings || []).length;

    console.log(`Found ${campaignStats?.length || 0} stat records and ${bookings?.length || 0} bookings (${actualMeetingsBooked} active)`);

    return new Response(
      JSON.stringify({
        success: true,
        connection: {
          id: connection.id,
          client_name: connection.client_name,
          is_active: connection.is_active,
          created_at: connection.created_at,
          client_timezone: connection.client_timezone || 'UTC'
        },
        stats: {
          latest: latestStats,
          history: campaignStats || [],
          actualMeetingsBooked
        },
        bookings: bookings || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Dashboard error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
