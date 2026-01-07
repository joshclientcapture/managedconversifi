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
    const { connection_id } = await req.json();

    if (!connection_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Connection ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch connection details
    const { data: connection, error: connError } = await supabase
      .from('client_connections')
      .select('*')
      .eq('id', connection_id)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ success: false, error: 'Connection not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Recreating webhook for ${connection.client_name}`);

    // Delete existing webhook if present
    if (connection.calendly_webhook_id) {
      try {
        const deleteResponse = await fetch(connection.calendly_webhook_id, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${connection.calendly_token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('Deleted old webhook:', deleteResponse.ok);
      } catch (e) {
        console.warn('Failed to delete old webhook:', e);
      }
    }

    // Create new webhook subscription with user scope
    const webhookUrl = `${supabaseUrl}/functions/v1/calendly-webhook`;
    
    const createResponse = await fetch('https://api.calendly.com/webhook_subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.calendly_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: ['invitee.created', 'invitee.canceled'],
        organization: connection.calendly_org_uri,
        user: connection.calendly_user_uri,
        scope: 'user',
        signing_key: Deno.env.get('CALENDLY_SIGNING_KEY') || null
      })
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      
      // Handle "Already Exists" error
      if (errorData.message?.includes('Already exists')) {
        console.log('Webhook already exists, fetching existing...');
        
        // List webhooks to find existing one
        const listResponse = await fetch(
          `https://api.calendly.com/webhook_subscriptions?organization=${connection.calendly_org_uri}&user=${connection.calendly_user_uri}&scope=user`,
          {
            headers: {
              'Authorization': `Bearer ${connection.calendly_token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (listResponse.ok) {
          const listData = await listResponse.json();
          const existingWebhook = listData.collection?.find((w: any) => w.callback_url === webhookUrl);
          
          if (existingWebhook) {
            // Update connection with existing webhook
            await supabase
              .from('client_connections')
              .update({ calendly_webhook_id: existingWebhook.uri })
              .eq('id', connection_id);

            return new Response(
              JSON.stringify({ success: true, webhook_uri: existingWebhook.uri, message: 'Using existing webhook' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        
        throw new Error('Webhook exists but could not be found');
      }
      
      throw new Error(errorData.message || 'Failed to create webhook');
    }

    const webhookData = await createResponse.json();
    const webhookUri = webhookData.resource?.uri;

    // Update connection with new webhook ID
    await supabase
      .from('client_connections')
      .update({ calendly_webhook_id: webhookUri })
      .eq('id', connection_id);

    console.log('Webhook recreated successfully:', webhookUri);

    return new Response(
      JSON.stringify({ success: true, webhook_uri: webhookUri }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook recreation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
