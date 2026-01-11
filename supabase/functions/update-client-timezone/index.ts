import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { access_token, client_timezone } = await req.json();

    if (!access_token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!client_timezone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Timezone is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate timezone is in the allowed list
    if (!VALID_TIMEZONES.includes(client_timezone)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid timezone' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Updating timezone to ${client_timezone} for access token: ${access_token}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update client connection timezone
    const { data, error } = await supabase
      .from('client_connections')
      .update({ client_timezone })
      .eq('access_token', access_token)
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to update timezone:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid access token or update failed' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Timezone updated successfully for ${data.client_name}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Timezone updated',
        client_timezone: data.client_timezone
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Update timezone error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});