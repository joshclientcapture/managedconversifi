import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { calendly_token } = await req.json();

    if (!calendly_token) {
      throw new Error('Calendly token is required');
    }

    console.log('Validating Calendly token...');

    const response = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${calendly_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Invalid Calendly token:', response.status);
      throw new Error('Invalid Calendly token');
    }

    const data = await response.json();
    
    console.log('Token validated for:', data.resource.name);

    return new Response(
      JSON.stringify({
        success: true,
        userUri: data.resource.uri,
        orgUri: data.resource.current_organization,
        userName: data.resource.name,
        userEmail: data.resource.email,
        schedulingUrl: data.resource.scheduling_url
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in get-calendly-info:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to validate token';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
