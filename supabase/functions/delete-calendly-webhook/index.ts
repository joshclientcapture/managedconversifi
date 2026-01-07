

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
    const { calendly_token, webhook_uri } = await req.json();

    if (!calendly_token || !webhook_uri) {
      throw new Error('Calendly token and webhook_uri are required');
    }

    console.log('Deleting webhook:', webhook_uri);

    const response = await fetch(webhook_uri, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${calendly_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok && response.status !== 204) {
      const errorText = await response.text();
      console.error('Calendly API error:', response.status, errorText);
      throw new Error(`Failed to delete webhook: ${response.status}`);
    }
    
    console.log('Webhook deleted successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in delete-calendly-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete webhook';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
