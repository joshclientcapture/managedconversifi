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
    const slackToken = Deno.env.get('SLACK_BOT_TOKEN');
    
    if (!slackToken) {
      console.error('SLACK_BOT_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Slack integration not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching Slack channels...');

    const response = await fetch(
      'https://slack.com/api/conversations.list?exclude_archived=true&types=public_channel,private_channel',
      {
        headers: {
          'Authorization': `Bearer ${slackToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Slack channels');
    }

    const data = await response.json();
    
    if (!data.ok) {
      console.error('Slack API error:', data.error);
      throw new Error(data.error || 'Slack API error');
    }

    const channels = data.channels.map((ch: any) => ({
      id: ch.id,
      name: ch.name
    }));

    console.log(`Found ${channels.length} channels`);

    return new Response(JSON.stringify({ channels }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    console.error('Error fetching Slack channels:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Slack channels';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
