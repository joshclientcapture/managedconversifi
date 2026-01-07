import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, calendly-webhook-signature',
};

// Verify Calendly webhook signature per https://developer.calendly.com/api-docs/4c305798a61d3-webhook-signatures
async function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  signingKey: string | null | undefined
): Promise<boolean> {
  if (!signingKey || !signature) {
    console.warn('Webhook signature verification skipped - no signing key or signature');
    return true;
  }

  try {
    // Calendly signature format: t=timestamp,v1=signature
    const parts = signature.split(',');
    const tPart = parts.find(p => p.startsWith('t='));
    const v1Part = parts.find(p => p.startsWith('v1='));
    
    if (!tPart || !v1Part) {
      console.error('Invalid signature format');
      return false;
    }

    const timestamp = tPart.split('=')[1];
    const expectedSignature = v1Part.split('=')[1];
    
    // Check timestamp is within 3 minutes to prevent replay attacks
    const currentTime = Math.floor(Date.now() / 1000);
    const webhookTime = parseInt(timestamp);
    if (Math.abs(currentTime - webhookTime) > 180) {
      console.error('Webhook timestamp too old:', currentTime - webhookTime, 'seconds');
      return false;
    }
    
    // Create the signed payload: timestamp.payload
    const signedPayload = `${timestamp}.${payload}`;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(signingKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return computedSignature === expectedSignature;
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
    const eventType = payload.event; // "invitee.created" or "invitee.canceled"
    console.log('Received Calendly webhook:', eventType);
    console.log('Full payload:', JSON.stringify(payload, null, 2));

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

    // =====================================================
    // PARSE WEBHOOK PAYLOAD PER CALENDLY API DOCUMENTATION
    // https://developer.calendly.com/api-docs/1da466e7fbc1b-get-sample-webhook-data
    // =====================================================
    // Structure: { event: "invitee.created", payload: { ...invitee data, scheduled_event: {...} } }
    // The invitee data is DIRECTLY in payload.payload (not payload.payload.invitee)
    // =====================================================

    const inviteeData = payload.payload;
    const scheduledEvent = inviteeData?.scheduled_event;
    
    // Event type URI for filtering (e.g., https://api.calendly.com/event_types/XXXX)
    const eventTypeUri = scheduledEvent?.event_type;
    
    // Get user URI from event_memberships for client matching
    const userUri = scheduledEvent?.event_memberships?.[0]?.user;

    // Extract invitee details
    const inviteeName = inviteeData?.name || 
      `${inviteeData?.first_name || ''} ${inviteeData?.last_name || ''}`.trim() || 
      'Unknown';
    const inviteeEmail = inviteeData?.email || null;
    const inviteeUri = inviteeData?.uri || null;
    const inviteeTimezone = inviteeData?.timezone || null;
    
    // Action URLs
    const rescheduleUrl = inviteeData?.reschedule_url || null;
    const cancelUrl = inviteeData?.cancel_url || null;
    
    // Reschedule detection
    const isRescheduled = inviteeData?.rescheduled === true;
    const oldInviteeUri = inviteeData?.old_invitee || null;
    
    // Extract phone from questions_and_answers or text_reminder_number
    const questionsAndAnswers = inviteeData?.questions_and_answers || [];
    const phoneFromQA = questionsAndAnswers.find(
      (q: { question: string; answer: string }) => 
        q.question?.toLowerCase().includes('phone') || 
        q.question?.toLowerCase().includes('number') ||
        q.question?.toLowerCase().includes('mobile')
    )?.answer;
    const inviteePhone = phoneFromQA || inviteeData?.text_reminder_number || null;
    
    // Extract scheduled event details
    const eventTime = scheduledEvent?.start_time || null;
    const eventEndTime = scheduledEvent?.end_time || null;
    const eventName = scheduledEvent?.name || 'Calendly Event';
    const eventUri = scheduledEvent?.uri || null;
    
    // Location info
    const eventLocation = scheduledEvent?.location;
    const locationDisplay = eventLocation?.location || eventLocation?.type || 'Virtual';
    
    // Extract calendly_event_id from URI (last segment)
    // e.g., https://api.calendly.com/scheduled_events/GBGBDCAADAEDCRZ2 -> GBGBDCAADAEDCRZ2
    const calendlyEventId = eventUri?.split('/').pop() || null;

    // Cancellation info (for invitee.canceled events)
    const cancellation = inviteeData?.cancellation;
    const cancelReason = cancellation?.reason || 'No reason provided';
    const canceledBy = cancellation?.canceled_by || cancellation?.canceler_type || 'Unknown';

    console.log('Parsed webhook data:', {
      eventType,
      inviteeName,
      inviteeEmail,
      inviteePhone,
      eventName,
      eventTime,
      eventTypeUri,
      userUri,
      calendlyEventId,
      isRescheduled,
      locationDisplay
    });

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

    // Match connection by Calendly user URI (try exact match first, then partial)
    let connection = connections?.find(c => {
      if (!userUri || !c.calendly_user_uri) return false;
      return c.calendly_user_uri === userUri;
    });
    
    // Fallback: partial match by user ID
    if (!connection) {
      connection = connections?.find(c => {
        if (!userUri || !c.calendly_user_uri) return false;
        const userIdFromWebhook = userUri.split('/').pop();
        const userIdFromDb = c.calendly_user_uri.split('/').pop();
        return userIdFromWebhook && userIdFromDb && userIdFromWebhook === userIdFromDb;
      });
    }

    if (!connection) {
      console.error('No matching client connection found for user:', userUri);
      return new Response(
        JSON.stringify({ error: 'No matching connection' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Matched to client: ${connection.client_name} (token: ${connection.access_token})`);

    // Check if this event type is in the watched list
    if (connection.watched_event_types && Array.isArray(connection.watched_event_types)) {
      const watchedTypes = connection.watched_event_types as string[];
      // Only filter if there are specific types selected (non-empty array)
      if (watchedTypes.length > 0 && eventTypeUri && !watchedTypes.includes(eventTypeUri)) {
        console.log(`Event type ${eventTypeUri} not in watched list:`, watchedTypes);
        return new Response(
          JSON.stringify({ message: 'Event type not watched, skipping' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Format event time for display
    const formattedTime = eventTime 
      ? new Date(eventTime).toLocaleString('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short'
        })
      : 'Time not specified';

    const slackToken = Deno.env.get('SLACK_BOT_TOKEN');

    // =====================================================
    // HANDLE CANCELLATION (invitee.canceled)
    // =====================================================
    if (eventType === 'invitee.canceled') {
      console.log('Processing cancellation...');
      
      // Update existing booking status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          event_status: 'canceled',
          raw_payload: payload 
        })
        .eq('calendly_invitee_uri', inviteeUri);

      if (updateError) {
        console.warn('Error updating booking status:', updateError);
      } else {
        console.log('Booking status updated to canceled');
      }

      // Send cancellation to Slack
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
              text: `❌ Booking canceled for ${connection.client_name}`,
              blocks: [
                {
                  type: 'header',
                  text: { type: 'plain_text', text: '❌ Calendly Booking Canceled', emoji: true }
                },
                {
                  type: 'section',
                  fields: [
                    { type: 'mrkdwn', text: `*Client:*\n${connection.client_name}` },
                    { type: 'mrkdwn', text: `*Contact:*\n${inviteeName}` },
                    { type: 'mrkdwn', text: `*Email:*\n${inviteeEmail || 'Not provided'}` },
                    { type: 'mrkdwn', text: `*Event:*\n${eventName}` },
                    { type: 'mrkdwn', text: `*Was Scheduled:*\n${formattedTime}` },
                    { type: 'mrkdwn', text: `*Canceled By:*\n${canceledBy}` },
                    { type: 'mrkdwn', text: `*Reason:*\n${cancelReason}` }
                  ]
                },
                {
                  type: 'context',
                  elements: [
                    { type: 'mrkdwn', text: `📋 Access Token: \`${connection.access_token}\` | Event ID: \`${calendlyEventId}\`` }
                  ]
                }
              ]
            })
          });
          
          const slackResult = await slackResponse.json();
          console.log('Slack cancellation notification:', slackResult.ok ? 'sent' : slackResult.error);
        } catch (slackError) {
          console.warn('Failed to send cancellation to Slack:', slackError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Cancellation processed', client: connection.client_name }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================================================
    // HANDLE NEW/RESCHEDULED BOOKING (invitee.created)
    // =====================================================
    
    // If this is a reschedule, mark the old booking as rescheduled
    if (isRescheduled && oldInviteeUri) {
      const { error: rescheduleError } = await supabase
        .from('bookings')
        .update({ event_status: 'rescheduled' })
        .eq('calendly_invitee_uri', oldInviteeUri);
      
      if (rescheduleError) {
        console.warn('Error updating old booking as rescheduled:', rescheduleError);
      } else {
        console.log('Previous booking marked as rescheduled');
      }
    }

    // 1. Create GHL contact using per-client API key
    const ghlApiKey = connection.ghl_api_key;
    if (ghlApiKey && connection.ghl_location_id) {
      try {
        console.log('Creating GHL contact...');
        
        // Split name into firstName and lastName for GHL API
        const nameParts = (inviteeName || '').trim().split(' ');
        const firstName = nameParts[0] || inviteeName || 'Unknown';
        const lastName = nameParts.slice(1).join(' ') || '';
        
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
            firstName: firstName,
            lastName: lastName,
            phone: inviteePhone,
            tags: ['calendly-booking', eventName].filter(Boolean),
            customFields: [
              { key: 'calendly_event_type', value: eventName },
              { key: 'calendly_event_time', value: eventTime || '' },
              { key: 'calendly_event_id', value: calendlyEventId || '' },
              { key: 'calendly_timezone', value: inviteeTimezone || '' },
              { key: 'access_token', value: connection.access_token || '' }
            ],
            source: 'Calendly'
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

    // 2. Send Slack notification with rich formatting
    if (slackToken && connection.slack_channel_id) {
      try {
        console.log('Sending Slack notification...');
        
        // Build action buttons if URLs exist
        const actionButtons: any[] = [];
        if (rescheduleUrl) {
          actionButtons.push({
            type: 'button',
            text: { type: 'plain_text', text: '📅 Reschedule', emoji: true },
            url: rescheduleUrl,
            style: 'primary'
          });
        }
        if (cancelUrl) {
          actionButtons.push({
            type: 'button',
            text: { type: 'plain_text', text: '❌ Cancel', emoji: true },
            url: cancelUrl
          });
        }

        const blocks: any[] = [
          {
            type: 'header',
            text: { 
              type: 'plain_text', 
              text: isRescheduled ? '🔄 Calendly Booking Rescheduled' : '🎯 New Calendly Booking', 
              emoji: true 
            }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Client:*\n${connection.client_name}` },
              { type: 'mrkdwn', text: `*Contact:*\n${inviteeName}` },
              { type: 'mrkdwn', text: `*Email:*\n${inviteeEmail || 'Not provided'}` },
              { type: 'mrkdwn', text: `*Phone:*\n${inviteePhone || 'Not provided'}` },
              { type: 'mrkdwn', text: `*Event:*\n${eventName}` },
              { type: 'mrkdwn', text: `*Time:*\n${formattedTime}` },
              { type: 'mrkdwn', text: `*Timezone:*\n${inviteeTimezone || 'N/A'}` },
              { type: 'mrkdwn', text: `*Location:*\n${locationDisplay}` }
            ]
          }
        ];

        // Add action buttons if any
        if (actionButtons.length > 0) {
          blocks.push({
            type: 'actions',
            elements: actionButtons
          });
        }

        // Add context footer
        blocks.push({
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `📋 Access Token: \`${connection.access_token}\` | Event ID: \`${calendlyEventId}\`` }
          ]
        });

        const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${slackToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channel: connection.slack_channel_id,
            text: `${isRescheduled ? '🔄 Rescheduled' : '🎯 New'} booking for ${connection.client_name}: ${inviteeName} - ${eventName}`,
            blocks
          })
        });
        
        const slackResult = await slackResponse.json();
        console.log('Slack notification:', slackResult.ok ? 'sent' : slackResult.error);
      } catch (slackError) {
        console.warn('Failed to send Slack notification:', slackError);
      }
    }

    // 3. Log booking to database
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
      calendly_event_id: calendlyEventId,
      event_status: 'scheduled',
      raw_payload: payload
    });

    if (bookingError) {
      console.error('Error logging booking:', bookingError);
    } else {
      console.log('Booking logged successfully');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Webhook processed: ${isRescheduled ? 'rescheduled' : 'new booking'}`,
        client: connection.client_name 
      }),
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
