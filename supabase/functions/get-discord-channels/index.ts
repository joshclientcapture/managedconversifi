import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  position: number;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get('DISCORD_BOT_TOKEN');
    
    if (!botToken) {
      console.error('DISCORD_BOT_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Discord bot not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the list of guilds the bot is in
    console.log('Fetching Discord guilds...');
    const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        'Authorization': `Bot ${botToken}`,
      },
    });

    if (!guildsResponse.ok) {
      const error = await guildsResponse.text();
      console.error('Discord guilds API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Discord servers', details: error }),
        { status: guildsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const guilds: DiscordGuild[] = await guildsResponse.json();
    console.log(`Found ${guilds.length} Discord servers`);

    // Fetch channels for each guild
    const allChannels: Array<{
      id: string;
      name: string;
      guildId: string;
      guildName: string;
    }> = [];

    for (const guild of guilds) {
      try {
        const channelsResponse = await fetch(`https://discord.com/api/v10/guilds/${guild.id}/channels`, {
          headers: {
            'Authorization': `Bot ${botToken}`,
          },
        });

        if (channelsResponse.ok) {
          const channels: DiscordChannel[] = await channelsResponse.json();
          
          // Filter to only text channels (type 0) that the bot can likely post to
          const textChannels = channels
            .filter(ch => ch.type === 0) // Text channels only
            .sort((a, b) => a.position - b.position)
            .map(ch => ({
              id: ch.id,
              name: ch.name,
              guildId: guild.id,
              guildName: guild.name,
            }));
          
          allChannels.push(...textChannels);
        } else {
          console.warn(`Failed to fetch channels for guild ${guild.name}:`, await channelsResponse.text());
        }
      } catch (error) {
        console.warn(`Error fetching channels for guild ${guild.name}:`, error);
      }
    }

    console.log(`Total text channels found: ${allChannels.length}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        guilds: guilds.map(g => ({ id: g.id, name: g.name })),
        channels: allChannels 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching Discord channels:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch Discord channels', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
