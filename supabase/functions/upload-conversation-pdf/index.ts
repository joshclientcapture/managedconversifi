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
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const bookingId = formData.get('booking_id') as string;
    const accessToken = formData.get('access_token') as string;

    if (!file || !bookingId || !accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'File, booking ID, and access token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return new Response(
        JSON.stringify({ success: false, error: 'Only PDF files are allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve client connection from access token
    const { data: connection, error: connError } = await supabase
      .from('client_connections')
      .select('*')
      .eq('access_token', accessToken)
      .single();

    if (connError || !connection) {
      console.error('Invalid access token:', connError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid access token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify booking belongs to this client connection
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      console.error('Booking fetch error:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authorized = booking.client_connection_id === connection.id || booking.access_token === accessToken;
    if (!authorized) {
      console.error('Unauthorized booking update');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload file to storage
    const fileName = `conversations/${bookingId}/${Date.now()}-${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(fileName, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to upload file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('reports')
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;

    // Update booking with PDF URL
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ conversation_pdf_url: pdfUrl })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update booking' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Conversation PDF uploaded for booking ${bookingId}: ${pdfUrl}`);

    // Build client portal URL
    const clientPortalUrl = `https://client.conversifi.io?code=${accessToken}`;

    // Send Discord notification if enabled
    if (connection.discord_enabled && connection.discord_webhook_url) {
      try {
        const embed = {
          title: '📄 Conversation Available',
          description: `The conversation transcript for **${booking.contact_name || 'a booking'}** is now available to view.`,
          color: 0x5865F2, // Discord blurple
          fields: [
            { name: '📧 Contact', value: booking.contact_email || 'Not provided', inline: true },
            { name: '📅 Event', value: booking.event_type_name || 'N/A', inline: true },
            { name: '🔗 View PDF', value: `[Click to view](${pdfUrl})`, inline: false }
          ],
          footer: { text: connection.client_name },
          timestamp: new Date().toISOString()
        };

        const discordResponse = await fetch(connection.discord_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'Conversifi Notifications',
            content: `✅ A conversation transcript is now available! [View in Dashboard](${clientPortalUrl}) or [View PDF directly](${pdfUrl})`,
            embeds: [embed]
          })
        });
        console.log('Discord notification:', discordResponse.ok ? 'sent' : 'failed');
      } catch (discordError) {
        console.warn('Failed to send Discord notification:', discordError);
      }
    }

    // Send Slack notification if enabled
    const slackToken = Deno.env.get('SLACK_BOT_TOKEN');
    if (slackToken && connection.slack_channel_id) {
      try {
        const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${slackToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channel: connection.slack_channel_id,
            text: `Conversation available: ${booking.contact_name || 'a booking'}`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `📄 *Conversation Available*\n\nThe conversation transcript for *${booking.contact_name || 'a booking'}* is now available to view.`
                }
              },
              { type: 'divider' },
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: `📧 *Contact*\n${booking.contact_email || 'Not provided'}` },
                  { type: 'mrkdwn', text: `📅 *Event*\n${booking.event_type_name || 'N/A'}` }
                ]
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: { type: 'plain_text', text: '📄 View PDF', emoji: true },
                    url: pdfUrl,
                    action_id: 'view_pdf'
                  },
                  {
                    type: 'button',
                    text: { type: 'plain_text', text: '🔗 Open Dashboard', emoji: true },
                    url: clientPortalUrl,
                    action_id: 'open_dashboard'
                  }
                ]
              },
              {
                type: 'context',
                elements: [
                  { type: 'mrkdwn', text: `🏢 ${connection.client_name}` }
                ]
              }
            ]
          })
        });

        const slackResult = await slackResponse.json();
        console.log('Slack notification:', slackResult.ok ? 'sent' : slackResult.error);
      } catch (slackError) {
        console.warn('Failed to send Slack notification:', slackError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, url: pdfUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Upload conversation PDF error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
