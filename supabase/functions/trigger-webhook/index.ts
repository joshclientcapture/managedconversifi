import Deno from "npm:@anthropic-ai/sdk@1.0.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cardId, columnId } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get column with webhook config
    const { data: column, error: columnError } = await supabase
      .from('kanban_columns')
      .select('*, kanban_boards(name, kanban_workspaces(name))')
      .eq('id', columnId)
      .single();

    if (columnError || !column?.webhook_url) {
      console.log('No webhook configured for column');
      return new Response(JSON.stringify({ success: false, message: 'No webhook configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get card details
    const { data: card, error: cardError } = await supabase
      .from('kanban_cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (cardError || !card) {
      return new Response(JSON.stringify({ success: false, message: 'Card not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    // Build payload
    const payload = {
      event: 'card_entered_column',
      timestamp: new Date().toISOString(),
      card: {
        id: card.id,
        title: card.title,
        description: card.description,
        priority: card.priority,
        due_date: card.due_date
      },
      column: {
        id: column.id,
        name: column.name
      },
      board: {
        name: column.kanban_boards?.name
      },
      workspace: {
        name: column.kanban_boards?.kanban_workspaces?.name
      }
    };

    // Send webhook
    console.log('Triggering webhook:', column.webhook_url);
    const response = await fetch(column.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('Webhook response:', response.status);

    return new Response(JSON.stringify({ success: true, status: response.status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
