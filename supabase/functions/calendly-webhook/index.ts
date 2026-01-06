import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, calendly-webhook-signature',
};

async function verifyWebhookSignature(payload: string, signature: string | null, signingKey: string | null | undefined): Promise<boolean> {
  if (!signingKey || !signature) {
    console.warn('Webhook signature verification skipped - no signing key or signature');
    return true;
  }

  try {
    const parts = signature.split(',');
    const tPart = parts.find(p => p.startsWith('t='));
    const v1Part = parts.find(p => p.startsWith('v1='));
    
    if (!tPart || !v1Part) {
      console.error('Invalid signature format');
      return false;
    }

    const t = tPart.split('=')[1];
    const v1 = v1Part.split('=')[1];
    const signedPayload = `${t}.${payload}`;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(signingKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return expectedSignature === v1;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('calendly-webhook-signature');
    const signingKey = Deno.env.get('CALENDLY_SIGNING_KEY');

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(rawBody, signature, signingKey);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.event;
    console.log('Received Calendly webhook:', eventType);

    // Handle both created and canceled events
    if (eventType !== 'invitee.created' && eventType !== 'invitee.canceled') {
      console.log('Ignoring event type:', eventType);
      return new Response(
        JSON.stringify({ message: 'Event ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract event data
    const invitee = payload.payload.invitee || payload.payload;
    const scheduledEvent = payload.payload.scheduled_event || payload.payload.event;
    const eventTypeUri = scheduledEvent?.event_type;
    const userUri = scheduledEvent?.event_memberships?.[0]?.user;

    const inviteeName = invitee.name;
    const inviteeEmail = invitee.email;
    const inviteePhone = invitee.questions_and_answers?.find(
      (q: { question: string; answer: string }) => q.question.toLowerCase().includes('phone')
    )?.answer || null;
    const eventTime = scheduledEvent?.start_time;
    const eventName = scheduledEvent?.name;
    const eventUri = scheduledEvent?.uri;
    const inviteeUri = invitee.uri;

    console.log(`Processing ${eventType}: ${inviteeName} (${inviteeEmail}) for ${eventName}`);

    // Find matching client connection by user URI
    const { data: connections, error: connError } = await supabase
      .from('client_connections')
      .select('*')
      .eq('is_active', true);

    if (connError) {
      console.error('Error fetching connections:', connError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Match connection by Calendly user URI
    const connection = connections?.find(c => {
      if (!userUri || !c.calendly_user_uri) return false;
      return userUri.includes(c.calendly_user_uri.split('/').pop() || '');
    });

    if (!connection) {
      console.error('No matching client connection found for user:', userUri);
      return new Response(
        JSON.stringify({ error: 'No matching connection' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Matched to client: ${connection.client_name} (${connection.access_token})`);

    // Check if this event type is in the watched list
    if (connection.watched_event_types && Array.isArray(connection.watched_event_types)) {
      const watchedTypes = connection.watched_event_types as string[];
      if (watchedTypes.length > 0 && !watchedTypes.includes(eventTypeUri)) {
        console.log(`Event type ${eventTypeUri} not in watched list, skipping`);
        return new Response(
          JSON.stringify({ message: 'Event type not watched' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle canceled events
    if (eventType === 'invitee.canceled') {
      console.log('Processing cancellation...');
      
      // Update existing booking status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ event_status: 'canceled' })
        .eq('calendly_invitee_uri', inviteeUri);

      if (updateError) {
        console.warn('Error updating booking status:', updateError);
      }

      // Send cancellation to Slack
      const slackToken = Deno.env.get('SLACK_BOT_TOKEN');
      if (slackToken && connection.slack_channel_id) {
        try {
          await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${slackToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              channel: connection.slack_channel_id,
              text: `❌ Booking canceled for ${connection.client_name}`,
              blocks: [
                {
                  type: 'header',
                  text: { type: 'plain_text', text: '❌ Booking Canceled', emoji: true }
                },
                {
                  type: 'section',
                  fields: [
                    { type: 'mrkdwn', text: `*Client:*\n${connection.client_name}` },
                    { type: 'mrkdwn', text: `*Contact:*\n${inviteeName}` },
                    { type: 'mrkdwn', text: `*Email:*\n${inviteeEmail}` },
                    { type: 'mrkdwn', text: `*Event:*\n${eventName}` }
                  ]
                }
              ]
            })
          });
        } catch (slackError) {
          console.warn('Failed to send cancellation to Slack:', slackError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Cancellation processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle new bookings (invitee.created)
    
    // 1. Create GHL contact
    const ghlApiKey = Deno.env.get('GHL_API_KEY');
    if (ghlApiKey) {
      try {
        console.log('Creating GHL contact...');
        const ghlResponse = await fetch('https://services.leadconnectorhq.com/contacts/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ghlApiKey}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            locationId: connection.ghl_location_id,
            email: inviteeEmail,
            name: inviteeName,
            phone: inviteePhone,
            tags: ['calendly-booking', connection.client_name],
            customFields: [
              { key: 'calendly_event_type', value: eventName },
              { key: 'calendly_event_time', value: eventTime },
              { key: 'access_token', value: connection.access_token }
            ]
          })
        });

        if (ghlResponse.ok) {
          console.log('GHL contact created successfully');
        } else {
          const ghlError = await ghlResponse.text();
          console.warn('GHL API error:', ghlError);
        }
      } catch (ghlError) {
        console.warn('Failed to create GHL contact:', ghlError);
      }
    }

    // 2. Send Slack notification
    const slackToken = Deno.env.get('SLACK_BOT_TOKEN');
    if (slackToken && connection.slack_channel_id) {
      try {
        console.log('Sending Slack notification...');
        const formattedTime = eventTime 
          ? new Date(eventTime).toLocaleString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric', 
              hour: 'numeric', 
              minute: '2-digit',
              timeZoneName: 'short'
            })
          : 'TBD';

        await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${slackToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channel: connection.slack_channel_id,
            text: `🎯 New booking for ${connection.client_name}`,
            blocks: [
              {
                type: 'header',
                text: { type: 'plain_text', text: '🎯 New Calendly Booking', emoji: true }
              },
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: `*Client:*\n${connection.client_name}` },
                  { type: 'mrkdwn', text: `*Contact:*\n${inviteeName}` },
                  { type: 'mrkdwn', text: `*Email:*\n${inviteeEmail}` },
                  { type: 'mrkdwn', text: `*Phone:*\n${inviteePhone || 'Not provided'}` },
                  { type: 'mrkdwn', text: `*Event:*\n${eventName}` },
                  { type: 'mrkdwn', text: `*Time:*\n${formattedTime}` }
                ]
              },
              {
                type: 'context',
                elements: [
                  { type: 'mrkdwn', text: `📋 Access Token: \`${connection.access_token}\`` }
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

    // 3. Log booking to database with access_token
    console.log('Logging booking to database...');
    const { error: bookingError } = await supabase.from('bookings').insert({
      client_connection_id: connection.id,
      access_token: connection.access_token,
      contact_name: inviteeName,
      contact_email: inviteeEmail,
      contact_phone: inviteePhone,
      event_type_name: eventName,
      event_type_uri: eventTypeUri,
      event_time: eventTime,
      calendly_event_uri: eventUri,
      calendly_invitee_uri: inviteeUri,
      event_status: 'scheduled',
      raw_payload: payload
    });

    if (bookingError) {
      console.error('Error logging booking:', bookingError);
    } else {
      console.log('Booking logged successfully');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
