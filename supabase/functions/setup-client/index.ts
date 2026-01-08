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
    const { 
      access_token,
      client_name,
      calendly_token, 
      calendly_user_uri,
      calendly_org_uri,
      watched_event_types,
      ghl_location_id, 
      ghl_location_name,
      ghl_api_key,
      slack_channel_id, 
      slack_channel_name,
      discord_channel_id,
      discord_channel_name,
      discord_guild_id,
      discord_guild_name,
      conversifi_webhook_url
    } = await req.json();

    console.log(`Setting up client with token: ${access_token?.substring(0, 8)}...`);

    // Validate required fields - now slack_channel_id is optional if discord is provided
    if (!access_token || !client_name || !calendly_token || !ghl_location_id || !conversifi_webhook_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // At least one notification channel required
    if (!slack_channel_id && !discord_channel_id) {
      return new Response(
        JSON.stringify({ error: 'At least one notification channel (Slack or Discord) is required' }),
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
      console.warn('Webhook registration failed:', webhookError);
      
      // Check if webhook already exists - try to find it
      if (webhookError.includes('Already exists') || webhookError.includes('already exists')) {
        console.log('Webhook already exists, attempting to find existing webhook...');
        try {
          const listResponse = await fetch(
            `https://api.calendly.com/webhook_subscriptions?organization=${encodeURIComponent(orgUri)}&scope=user&user=${encodeURIComponent(userUri)}`,
            {
              headers: {
                'Authorization': `Bearer ${calendly_token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (listResponse.ok) {
            const listData = await listResponse.json();
            const existingWebhook = listData.collection?.find(
              (wh: { callback_url: string }) => wh.callback_url === webhookUrl
            );
            if (existingWebhook) {
              webhookId = existingWebhook.uri;
              console.log('Found existing webhook:', webhookId);
            }
          }
        } catch (listError) {
          console.warn('Failed to list existing webhooks:', listError);
        }
      }
    }

    // Step 3: Create Discord webhook if Discord channel selected
    let discordWebhookUrl = null;
    if (discord_channel_id) {
      const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
      if (botToken) {
        try {
          console.log('Creating Discord webhook...');
          const webhookResponse = await fetch(`https://discord.com/api/v10/channels/${discord_channel_id}/webhooks`, {
            method: 'POST',
            headers: {
              'Authorization': `Bot ${botToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'Conversifi Notifications',
            }),
          });

          if (webhookResponse.ok) {
            const webhookData = await webhookResponse.json();
            discordWebhookUrl = `https://discord.com/api/webhooks/${webhookData.id}/${webhookData.token}`;
            console.log('Discord webhook created:', webhookData.id);
          } else {
            console.warn('Failed to create Discord webhook:', await webhookResponse.text());
          }
        } catch (discordError) {
          console.warn('Error creating Discord webhook:', discordError);
        }
      }
    }

    // Step 4: Store connection in database with access_token
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
        ghl_api_key,
        slack_channel_id: slack_channel_id || null,
        slack_channel_name: slack_channel_name || null,
        discord_channel_id: discord_channel_id || null,
        discord_channel_name: discord_channel_name || null,
        discord_guild_id: discord_guild_id || null,
        discord_guild_name: discord_guild_name || null,
        discord_webhook_url: discordWebhookUrl,
        discord_enabled: !!discord_channel_id,
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

    // Step 5: Send confirmation to Slack with access token
    const slackToken = Deno.env.get('SLACK_BOT_TOKEN');
    if (slackToken && slack_channel_id) {
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

    // Step 6: Send confirmation to Discord
    if (discordWebhookUrl) {
      try {
        const watchedCount = watched_event_types?.length || 'all';
        await fetch(discordWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: '✅ Client Integration Activated',
              color: 0x57F287, // Discord green
              fields: [
                { name: 'Client', value: client_name, inline: true },
                { name: 'Access Token', value: `\`${accessToken}\``, inline: true },
                { name: 'Calendly Events', value: watchedCount === 'all' ? 'All events' : `${watchedCount} selected`, inline: true },
                { name: 'GHL Location', value: ghl_location_name, inline: true }
              ],
              footer: { text: '📊 Campaign stats syncing • 🎯 Bookings active • 📨 Notifications enabled' },
              timestamp: new Date().toISOString()
            }]
          })
        });
        console.log('Discord notification sent');
      } catch (discordError) {
        console.warn('Failed to send Discord notification:', discordError);
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
