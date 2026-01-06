import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, calendly-webhook-signature',
};

async function verifyWebhookSignature(payload: string, signature: string | null, signingKey: string | null | undefined): Promise<boolean> {
  if (!signingKey || !signature) {
    console.warn('Webhook signature verification skipped - no signing key or signature');
    return true; // Skip verification if no signing key configured
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
  // Handle CORS preflight
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
    console.log('Received Calendly webhook:', payload.event);

    // Only handle invitee.created events
    if (payload.event !== 'invitee.created') {
      console.log('Ignoring non-invitee.created event:', payload.event);
      return new Response(
        JSON.stringify({ message: 'Event ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract event data
    const invitee = payload.payload.invitee;
    const event = payload.payload.event;
    const scheduledEvent = payload.payload.scheduled_event;

    const inviteeName = invitee.name;
    const inviteeEmail = invitee.email;
    const inviteePhone = invitee.questions_and_answers?.find(
      (q: { question: string; answer: string }) => q.question.toLowerCase().includes('phone')
    )?.answer || null;
    const eventTime = scheduledEvent?.start_time;
    const eventType = scheduledEvent?.name || event?.name;
    const eventUri = scheduledEvent?.uri || event?.uri;
    
    // Get the creator URI from the event
    const creatorUri = scheduledEvent?.event_memberships?.[0]?.user || 
                       payload.payload.event?.uri?.split('/scheduled_events/')?.[0];

    console.log(`New booking: ${inviteeName} (${inviteeEmail}) for ${eventType} at ${eventTime}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find matching client connection
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
    const connection = connections?.find(c => 
      creatorUri && c.calendly_user_uri && creatorUri.includes(c.calendly_user_uri.split('/').pop())
    ) || connections?.[0]; // Fallback to first active connection

    if (!connection) {
      console.error('No matching client connection found');
      return new Response(
        JSON.stringify({ error: 'No matching connection' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Matched to client: ${connection.client_name}`);

    // Send to GHL
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
            tags: ['calendly-booking'],
            customFields: [
              { key: 'event_type', value: eventType },
              { key: 'booking_time', value: eventTime }
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

    // Send Slack notification
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
                text: {
                  type: 'plain_text',
                  text: '🎯 New Calendly Booking',
                  emoji: true
                }
              },
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: `*Client:*\n${connection.client_name}` },
                  { type: 'mrkdwn', text: `*Contact:*\n${inviteeName}` },
                  { type: 'mrkdwn', text: `*Email:*\n${inviteeEmail}` },
                  { type: 'mrkdwn', text: `*Phone:*\n${inviteePhone || 'Not provided'}` },
                  { type: 'mrkdwn', text: `*Event:*\n${eventType}` },
                  { type: 'mrkdwn', text: `*Time:*\n${formattedTime}` }
                ]
              },
              {
                type: 'divider'
              }
            ]
          })
        });
        console.log('Slack notification sent');
      } catch (slackError) {
        console.warn('Failed to send Slack notification:', slackError);
      }
    }

    // Log booking to database
    console.log('Logging booking to database...');
    const { error: bookingError } = await supabase.from('bookings').insert({
      client_connection_id: connection.id,
      contact_name: inviteeName,
      contact_email: inviteeEmail,
      contact_phone: inviteePhone,
      event_type: eventType,
      event_time: eventTime,
      calendly_event_id: eventUri,
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
