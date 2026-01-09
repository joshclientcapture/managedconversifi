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

    // Auto-update past scheduled bookings to completed
    if (bookings && bookings.length > 0) {
      const now = new Date();
      const pastScheduledBookings = bookings.filter((booking: any) => {
        if (booking.event_status !== 'scheduled') return false;
        if (!booking.event_time) return false;
        const eventTime = new Date(booking.event_time);
        return eventTime < now;
      });

      if (pastScheduledBookings.length > 0) {
        console.log(`Auto-updating ${pastScheduledBookings.length} past scheduled bookings to completed`);
        const bookingIds = pastScheduledBookings.map((b: any) => b.id);

        const { error: updateError } = await supabase
          .from('bookings')
          .update({ event_status: 'completed' })
          .in('id', bookingIds);

        if (!updateError) {
          // Update local bookings array to reflect changes
          bookings.forEach((booking: any) => {
            if (bookingIds.includes(booking.id)) {
              booking.event_status = 'completed';
            }
          });
        } else {
          console.warn('Error auto-updating past bookings:', updateError);
        }
      }
    }

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
          created_at: connection.created_at
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
