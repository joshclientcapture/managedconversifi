import { createClient } from "npm:@supabase/supabase-js@2";

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

Deno.serve(async (req: Request) => {
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
    // =====================================================
    const inviteeData = payload.payload;
    const scheduledEvent = inviteeData?.scheduled_event;
    
    // Event type URI for filtering
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

    // Extract custom questions (excluding phone-related questions)
    const customQuestions = questionsAndAnswers.filter(
      (q: { question: string; answer: string }) => {
        const question = q.question?.toLowerCase() || '';
        return !question.includes('phone') &&
               !question.includes('number') &&
               !question.includes('mobile');
      }
    );

    console.log('Custom questions extracted:', customQuestions.length, JSON.stringify(customQuestions));
    
    // Extract scheduled event details
    const eventTime = scheduledEvent?.start_time || null;
    const eventEndTime = scheduledEvent?.end_time || null;
    const eventName = scheduledEvent?.name || 'Calendly Event';
    const eventUri = scheduledEvent?.uri || null;
    
    // Location info
    const eventLocation = scheduledEvent?.location;
    const locationDisplay = eventLocation?.location || eventLocation?.type || 'Virtual';
    
    // Extract calendly_event_id from URI
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

    // Match connection by Calendly user URI
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

    console.log(`Matched to client: ${connection.client_name}`);

    // Check if this event type is in the watched list
    if (connection.watched_event_types && Array.isArray(connection.watched_event_types)) {
      const watchedTypes = connection.watched_event_types as string[];
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
          weekday: 'short',
          month: 'short',
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

      // Send cancellation to Slack - Clean, client-friendly format
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
              text: `Booking canceled: ${inviteeName}`,
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `❌ *Booking Canceled*\n\n*${inviteeName}* has canceled their ${eventName} appointment.`
                  }
                },
                { type: 'divider' },
                {
                  type: 'section',
                  fields: [
                    { type: 'mrkdwn', text: `📧 *Email*\n${inviteeEmail || 'Not provided'}` },
                    { type: 'mrkdwn', text: `📅 *Was Scheduled*\n${formattedTime}` },
                    { type: 'mrkdwn', text: `👤 *Canceled By*\n${canceledBy}` },
                    { type: 'mrkdwn', text: `💬 *Reason*\n${cancelReason}` }
                  ]
                },
                {
                  type: 'context',
                  elements: [
                    { type: 'mrkdwn', text: `🏢 ${connection.client_name} • ${eventName}` }
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

      // Send cancellation to Discord
      if (connection.discord_enabled && connection.discord_webhook_url) {
        try {
          // Build client portal URL with access code
          const clientPortalUrl = `https://client.conversifi.io?code=${connection.access_token || ''}`;

          const embed: any = {
            title: '❌ Booking Canceled',
            description: `**${inviteeName}** has canceled their appointment.`,
            color: 0xED4245, // Discord red
            fields: [
              { name: '📅 Was Scheduled', value: formattedTime, inline: true },
              { name: '📧 Email', value: inviteeEmail || 'Not provided', inline: true },
              { name: '💬 Reason', value: cancelReason, inline: false }
            ],
            footer: { text: `${connection.client_name}` },
            timestamp: new Date().toISOString()
          };

          // Add client portal link in description
          if (connection.access_token) {
            embed.description += `\n\n🔗 View booking details at: ${clientPortalUrl}`;
          }

          const discordResponse = await fetch(connection.discord_webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] })
          });
          console.log('Discord cancellation notification:', discordResponse.ok ? 'sent' : 'failed');
        } catch (discordError) {
          console.warn('Failed to send cancellation to Discord:', discordError);
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

        // Format custom questions for GHL notes
        let notes = `Calendly Booking: ${eventName}\nScheduled: ${formattedTime}`;
        if (customQuestions.length > 0) {
          notes += '\n\n--- Custom Questions ---';
          customQuestions.forEach((q: { question: string; answer: string }) => {
            notes += `\n${q.question}: ${q.answer}`;
          });
        }

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
              { key: 'calendly_timezone', value: inviteeTimezone || '' }
            ],
            source: 'Calendly',
            notes: notes
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

    // 2. Send Slack notification with clean, client-friendly formatting
    if (slackToken && connection.slack_channel_id) {
      try {
        console.log('Sending Slack notification...');
        
        const headerText = isRescheduled 
          ? `🔄 *Booking Rescheduled*\n\n*${inviteeName}* has rescheduled their appointment.`
          : `🎯 *New Booking*\n\n*${inviteeName}* has booked a ${eventName}.`;

        // Build action buttons if URLs exist
        const actionElements: any[] = [];
        if (rescheduleUrl) {
          actionElements.push({
            type: 'button',
            text: { type: 'plain_text', text: 'Reschedule', emoji: true },
            url: rescheduleUrl
          });
        }
        if (cancelUrl) {
          actionElements.push({
            type: 'button',
            text: { type: 'plain_text', text: 'Cancel', emoji: true },
            url: cancelUrl,
            style: 'danger'
          });
        }

        const blocks: any[] = [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: headerText }
          },
          { type: 'divider' },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `📅 *When*\n${formattedTime}` },
              { type: 'mrkdwn', text: `📍 *Location*\n${locationDisplay}` },
              { type: 'mrkdwn', text: `📧 *Email*\n${inviteeEmail || 'Not provided'}` },
              { type: 'mrkdwn', text: `📱 *Phone*\n${inviteePhone || 'Not provided'}` }
            ]
          }
        ];

        // Add action buttons if any
        if (actionElements.length > 0) {
          blocks.push({
            type: 'actions',
            elements: actionElements
          });
        }

        // Add subtle context footer
        blocks.push({
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `🏢 ${connection.client_name} • ${eventName}` }
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
            text: `${isRescheduled ? 'Rescheduled' : 'New'} booking: ${inviteeName} - ${eventName}`,
            blocks
          })
        });
        
        const slackResult = await slackResponse.json();
        console.log('Slack notification:', slackResult.ok ? 'sent' : slackResult.error);
      } catch (slackError) {
        console.warn('Failed to send Slack notification:', slackError);
      }
    }

    // 2b. Send Discord notification
    if (connection.discord_enabled && connection.discord_webhook_url) {
      try {
        console.log('Sending Discord notification...');

        const title = isRescheduled ? '🔄 Booking Rescheduled' : '🎯 New Booking';
        const description = isRescheduled
          ? `**${inviteeName}** has rescheduled their appointment.`
          : `**${inviteeName}** has booked a ${eventName}.`;

        // Build client portal URL with access code
        const clientPortalUrl = `https://client.conversifi.io?code=${connection.access_token || ''}`;

        // Build Discord embed
        const embed: any = {
          title,
          description,
          color: isRescheduled ? 0xFEE75C : 0x57F287, // Yellow for reschedule, green for new
          fields: [
            { name: '📅 When', value: formattedTime, inline: true },
            { name: '📧 Email', value: inviteeEmail || 'Not provided', inline: true },
            { name: '📱 Phone', value: inviteePhone || 'Not provided', inline: true },
            { name: '🔑 Access Code', value: connection.access_token || 'N/A', inline: true }
          ],
          footer: { text: `${connection.client_name}` },
          timestamp: new Date().toISOString()
        };

        // Add custom questions as fields (if applicable)
        console.log('Adding custom questions to Discord:', customQuestions.length);
        if (customQuestions.length > 0) {
          customQuestions.forEach((q: { question: string; answer: string }) => {
            console.log('Adding question to Discord:', q.question, '=', q.answer);
            embed.fields.push({
              name: `❓ ${q.question}`,
              value: q.answer || 'Not provided',
              inline: false
            });
          });
        }

        // Add client portal link in description
        if (connection.access_token) {
          embed.description += `\n\n🔗 View and manage this booking at: ${clientPortalUrl}`;
        }

        // Build action buttons (Discord uses components)
        const components: any[] = [];
        const buttons: any[] = [];

        // Add client portal button as primary action
        if (connection.access_token) {
          buttons.push({
            type: 2, // Button
            style: 5, // Link
            label: 'View Booking',
            url: clientPortalUrl
          });
        }

        if (buttons.length > 0) {
          components.push({
            type: 1, // Action Row
            components: buttons
          });
        }

        const discordPayload: any = { embeds: [embed] };
        if (components.length > 0) {
          discordPayload.components = components;
        }

        const discordResponse = await fetch(connection.discord_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(discordPayload)
        });

        console.log('Discord notification:', discordResponse.ok ? 'sent' : 'failed');
      } catch (discordError) {
        console.warn('Failed to send Discord notification:', discordError);
      }
    }

    // 3. Log booking to database with action URLs
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
      reschedule_url: rescheduleUrl,
      cancel_url: cancelUrl,
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
