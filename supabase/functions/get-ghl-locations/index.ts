import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    const ghlApiKey = Deno.env.get('GHL_API_KEY');
    
    if (!ghlApiKey) {
      console.error('GHL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'GHL integration not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching GHL locations...');

    const response = await fetch(
      'https://services.leadconnectorhq.com/locations/search?limit=100',
      {
        headers: {
          'Authorization': `Bearer ${ghlApiKey}`,
          'Version': '2021-07-28'
        }
      }
    );

    if (!response.ok) {
      console.error('GHL API error:', response.status, response.statusText);
      throw new Error('Failed to fetch GHL locations');
    }

    const data = await response.json();
    
    const locations = data.locations.map((loc: any) => ({
      locationId: loc.id,
      locationName: loc.name,
      ownerName: loc.firstName && loc.lastName 
        ? `${loc.firstName.trim()} ${loc.lastName.trim()}` 
        : 'No owner'
    }));

    console.log(`Found ${locations.length} GHL locations`);

    return new Response(JSON.stringify({ locations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    console.error('Error fetching GHL locations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch GHL locations';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
