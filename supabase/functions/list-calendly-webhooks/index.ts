

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { calendly_token, org_uri, user_uri } = await req.json();

    if (!calendly_token || !org_uri || !user_uri) {
      throw new Error('Calendly token, org_uri, and user_uri are required');
    }

    console.log('Fetching webhooks for user:', user_uri);

    const response = await fetch(
      `https://api.calendly.com/webhook_subscriptions?organization=${encodeURIComponent(org_uri)}&scope=user&user=${encodeURIComponent(user_uri)}`,
      {
        headers: {
          'Authorization': `Bearer ${calendly_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Calendly API error:', response.status, errorText);
      throw new Error(`Failed to fetch webhooks: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('Found', data.collection?.length || 0, 'webhooks');

    return new Response(
      JSON.stringify({
        success: true,
        webhooks: data.collection || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in list-calendly-webhooks:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to list webhooks';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
