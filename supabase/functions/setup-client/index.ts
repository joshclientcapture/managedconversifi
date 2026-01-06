import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      access_token,
      client_name,
      calendly_token, 
      calendly_user_uri,
      calendly_org_uri,
      watched_event_types,
      ghl_location_id, 
      ghl_location_name,
      slack_channel_id, 
      slack_channel_name,
      conversifi_webhook_url
    } = await req.json();

    console.log(`Setting up client with token: ${access_token?.substring(0, 8)}...`);

    // Validate required fields
    if (!access_token || !client_name || !calendly_token || !ghl_location_id || !slack_channel_id || !conversifi_webhook_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = access_token;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Verify Calendly token and get user info (if not provided)
    let userUri = calendly_user_uri;
    let orgUri = calendly_org_uri;
    
    if (!userUri || !orgUri) {
      console.log('Verifying Calendly token...');
      const userResponse = await fetch('https://api.calendly.com/users/me', {
        headers: { 'Authorization': `Bearer ${calendly_token}` }
      });

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error('Calendly API error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Invalid Calendly API token', details: errorText }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userData = await userResponse.json();
      userUri = userData.resource.uri;
      orgUri = userData.resource.current_organization;

      console.log(`Calendly user verified: ${userData.resource.email}`);
    } else {
      console.log('Using provided Calendly user/org URIs');
    }

    // Step 2: Register Calendly webhook
    console.log('Registering Calendly webhook...');
    const webhookUrl = `${supabaseUrl}/functions/v1/calendly-webhook`;
    const signingKey = Deno.env.get('CALENDLY_SIGNING_KEY');

    const webhookPayload: Record<string, unknown> = {
      url: webhookUrl,
      events: ['invitee.created', 'invitee.canceled'],
      organization: orgUri,
      user: userUri,
      scope: 'user'
    };

    if (signingKey) {
      webhookPayload.signing_key = signingKey;
    }

    const webhookResponse = await fetch('https://api.calendly.com/webhook_subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${calendly_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });

    let webhookId = null;
    if (webhookResponse.ok) {
      const webhookData = await webhookResponse.json();
      webhookId = webhookData.resource?.uri;
      console.log('Webhook registered successfully:', webhookId);
    } else {
      const webhookError = await webhookResponse.text();
      console.warn('Webhook registration failed (may already exist):', webhookError);
    }

    // Step 3: Store connection in database with access_token
    console.log('Storing client connection...');
    const { data, error } = await supabase
      .from('client_connections')
      .insert({
        access_token: accessToken,
        client_name: client_name,
        calendly_token,
        calendly_webhook_id: webhookId,
        calendly_user_uri: userUri,
        calendly_org_uri: orgUri,
        watched_event_types: watched_event_types && watched_event_types.length > 0 
          ? watched_event_types 
          : null,
        ghl_location_id,
        ghl_location_name,
        slack_channel_id,
        slack_channel_name,
        conversifi_webhook_url,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to store connection', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Client connection created successfully:', data.id);

    // Step 4: Send confirmation to Slack with access token
    const slackToken = Deno.env.get('SLACK_BOT_TOKEN');
    if (slackToken) {
      try {
        const watchedCount = watched_event_types?.length || 'all';
        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${slackToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channel: slack_channel_id,
            text: `🎉 New client integration activated: ${client_name}`,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: '✅ Client Integration Activated',
                  emoji: true
                }
              },
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: `*Client:*\n${client_name}` },
                  { type: 'mrkdwn', text: `*Access Token:*\n\`${accessToken}\`` },
                  { type: 'mrkdwn', text: `*Calendly Events:*\n${watchedCount === 'all' ? 'All events' : `${watchedCount} selected`}` },
                  { type: 'mrkdwn', text: `*GHL Location:*\n${ghl_location_name}` }
                ]
              },
              {
                type: 'context',
                elements: [
                  { type: 'mrkdwn', text: '📊 Campaign stats syncing • 🎯 Bookings active • 📨 Notifications enabled' }
                ]
              }
            ]
          })
        });
        console.log('Slack notification sent');
      } catch (slackError) {
        console.warn('Failed to send Slack notification:', slackError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        connection: {
          id: data.id,
          access_token: accessToken,
          client_name: data.client_name,
          is_active: data.is_active,
          calendly_connected: true,
          ghl_connected: true,
          slack_connected: true,
          conversifi_connected: true
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Setup error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to setup client integration', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
