const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { api_key, location_id } = await req.json();
    
    if (!api_key) {
      return new Response(
        JSON.stringify({ success: false, error: 'API key is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!location_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Location ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Validating GHL API key for location:', location_id);

    // Try to fetch contacts to validate the API key works
    const response = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${location_id}&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Version': '2021-07-28'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL API validation failed:', response.status, errorText);
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid API key - unauthorized' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 403) {
        return new Response(
          JSON.stringify({ success: false, error: 'API key does not have access to this location' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: `GHL API error: ${response.status}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('GHL API key validated successfully, contacts accessible');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'API key is valid and can access contacts',
        contactCount: data.contacts?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error validating GHL API key:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to validate API key';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
