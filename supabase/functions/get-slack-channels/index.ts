import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const slackToken = Deno.env.get('SLACK_BOT_TOKEN');
    
    if (!slackToken) {
      console.error('SLACK_BOT_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Slack integration not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching Slack channels...');

    const response = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true', {
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Slack API error:', data.error);
      return new Response(
        JSON.stringify({ error: `Slack API error: ${data.error}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const channels = data.channels.map((ch: { id: string; name: string; is_private: boolean }) => ({
      id: ch.id,
      name: ch.name,
      is_private: ch.is_private
    }));

    console.log(`Found ${channels.length} channels`);

    return new Response(
      JSON.stringify({ channels }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching Slack channels:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch Slack channels' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
