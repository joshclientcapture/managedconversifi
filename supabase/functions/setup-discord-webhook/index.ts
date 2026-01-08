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
      client_connection_id,
      channel_id, 
      channel_name,
      guild_id,
      guild_name 
    } = await req.json();

    if (!client_connection_id || !channel_id || !guild_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: client_connection_id, channel_id, guild_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
    
    if (!botToken) {
      return new Response(
        JSON.stringify({ error: 'Discord bot not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating Discord webhook for channel ${channel_id} in guild ${guild_id}...`);

    // Create a webhook in the selected channel
    const webhookResponse = await fetch(`https://discord.com/api/v10/channels/${channel_id}/webhooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Conversifi Notifications',
        avatar: 'https://client.conversifi.io/discordlogo.png',
      }),
    });

    if (!webhookResponse.ok) {
      const error = await webhookResponse.text();
      console.error('Failed to create Discord webhook:', error);
      
      // Check if we lack permissions
      if (webhookResponse.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: 'Bot lacks permission to create webhooks in this channel. Please ensure the bot has "Manage Webhooks" permission.' 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to create Discord webhook', details: error }),
        { status: webhookResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookData = await webhookResponse.json();
    const webhookUrl = `https://discord.com/api/webhooks/${webhookData.id}/${webhookData.token}`;
    
    console.log('Discord webhook created successfully:', webhookData.id);

    // Update the client connection with Discord details
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from('client_connections')
      .update({
        discord_webhook_url: webhookUrl,
        discord_channel_id: channel_id,
        discord_channel_name: channel_name || null,
        discord_guild_id: guild_id,
        discord_guild_name: guild_name || null,
        discord_enabled: true,
      })
      .eq('id', client_connection_id);

    if (updateError) {
      console.error('Failed to update client connection:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save Discord configuration', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Client connection updated with Discord webhook');

    // Send a test message to confirm it's working
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '✅ Discord Connected',
            description: 'Booking notifications will now be sent to this channel.',
            color: 0x1B4498, // Conversifi brand blue
            footer: { text: 'Conversifi Integration' }
          }]
        })
      });
    } catch (testError) {
      console.warn('Failed to send test message:', testError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Discord webhook created and connected',
        channel_id,
        channel_name,
        guild_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error setting up Discord webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to setup Discord webhook', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
