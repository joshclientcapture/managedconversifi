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
    const { calendly_token, user_uri } = await req.json();

    if (!calendly_token || !user_uri) {
      throw new Error('Calendly token and user URI are required');
    }

    console.log('Fetching event types for user...');

    const response = await fetch(
      `https://api.calendly.com/event_types?user=${encodeURIComponent(user_uri)}&active=true&count=100`,
      {
        headers: {
          'Authorization': `Bearer ${calendly_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch event types:', response.status);
      throw new Error('Failed to fetch event types');
    }

    const data = await response.json();
    
    const eventTypes = data.collection.map((et: { uri: string; name: string; duration: number; active: boolean; scheduling_url: string; type: string }) => ({
      uri: et.uri,
      name: et.name,
      duration: et.duration,
      active: et.active,
      scheduling_url: et.scheduling_url,
      type: et.type
    }));

    console.log(`Found ${eventTypes.length} event types`);

    return new Response(
      JSON.stringify({ success: true, eventTypes }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in get-calendly-event-types:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch event types';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
