import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  mobile?: string;
  status?: string;
  reason?: string;
  transactionId?: string;
  msgId?: string;
  timestamp?: string;
  [key: string]: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== WEBHOOK RECEIVED ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', Object.fromEntries(req.headers.entries()));

    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse the request body
    let payload: WebhookPayload;
    try {
      const bodyText = await req.text();
      console.log('Raw body:', bodyText);
      
      // Try to parse as JSON
      payload = JSON.parse(bodyText);
    } catch (parseError) {
      console.log('Failed to parse JSON, trying form data...');
      
      // Try to parse as form data
      const formData = await req.formData();
      payload = {};
      for (const [key, value] of formData.entries()) {
        payload[key] = value;
      }
    }

    console.log('Parsed payload:', payload);

    // Extract key information from the webhook
    const {
      mobile,
      status,
      reason,
      transactionId,
      msgId,
      timestamp,
      ...otherFields
    } = payload;

    console.log('Extracted data:');
    console.log('  Mobile:', mobile);
    console.log('  Status:', status);
    console.log('  Reason:', reason);
    console.log('  Transaction ID:', transactionId);
    console.log('  Message ID:', msgId);
    console.log('  Timestamp:', timestamp);
    console.log('  Other fields:', otherFields);

    // Validate required fields
    if (!mobile || !status) {
      console.log('Missing required fields: mobile or status');
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: mobile or status'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Find the message in the database using transaction ID or message ID
    let messageQuery = supabaseClient
      .from('messages')
      .select('id, campaign_id, client_id, status, recipient_phone')
      .eq('recipient_phone', mobile);

    if (transactionId) {
      messageQuery = messageQuery.eq('transaction_id', transactionId);
    } else if (msgId) {
      messageQuery = messageQuery.eq('message_id', msgId);
    }

    const { data: messages, error: messageError } = await messageQuery;

    if (messageError) {
      console.error('Error finding message:', messageError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Database error while finding message'
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (!messages || messages.length === 0) {
      console.log('No message found for mobile:', mobile, 'transactionId:', transactionId, 'msgId:', msgId);
      
      // Log unknown webhook for debugging
      await supabaseClient
        .from('webhook_logs')
        .insert({
          payload: payload,
          status: 'unknown_message',
          mobile: mobile,
          transaction_id: transactionId,
          message_id: msgId
        });

      return new Response(JSON.stringify({
        success: false,
        error: 'Message not found'
      }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const message = messages[0];
    console.log('Found message:', message);

    // Map webhook status to our status
    let newStatus = 'pending';
    let errorMessage = null;

    switch (status.toLowerCase()) {
      case 'delivered':
      case 'success':
        newStatus = 'delivered';
        break;
      case 'failed':
      case 'error':
        newStatus = 'failed';
        errorMessage = reason || 'Delivery failed';
        break;
      case 'sent':
        newStatus = 'sent';
        break;
      case 'pending':
      case 'queued':
        newStatus = 'pending';
        break;
      default:
        newStatus = 'unknown';
        errorMessage = `Unknown status: ${status}`;
    }

    console.log('Status mapping:', { original: status, mapped: newStatus, error: errorMessage });

    // Update the message status
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    if (transactionId) {
      updateData.transaction_id = transactionId;
    }

    if (msgId) {
      updateData.message_id = msgId;
    }

    const { error: updateError } = await supabaseClient
      .from('messages')
      .update(updateData)
      .eq('id', message.id);

    if (updateError) {
      console.error('Error updating message:', updateError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Database error while updating message'
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('Message updated successfully');

    // Update campaign statistics if we have a campaign_id
    if (message.campaign_id) {
      console.log('Updating campaign statistics...');
      
      // Get current campaign stats
      const { data: campaign, error: campaignError } = await supabaseClient
        .from('campaigns')
        .select('sent_count, delivered_count, failed_count')
        .eq('id', message.campaign_id)
        .single();

      if (!campaignError && campaign) {
        const updateFields: any = {};

        // Update appropriate counter based on new status
        if (newStatus === 'delivered' && message.status !== 'delivered') {
          updateFields.delivered_count = (campaign.delivered_count || 0) + 1;
          // Decrease sent count if it was previously counted as sent
          if (message.status === 'sent') {
            updateFields.sent_count = Math.max(0, (campaign.sent_count || 0) - 1);
          }
        } else if (newStatus === 'failed' && message.status !== 'failed') {
          updateFields.failed_count = (campaign.failed_count || 0) + 1;
          // Decrease sent count if it was previously counted as sent
          if (message.status === 'sent') {
            updateFields.sent_count = Math.max(0, (campaign.sent_count || 0) - 1);
          }
        } else if (newStatus === 'sent' && message.status !== 'sent') {
          updateFields.sent_count = (campaign.sent_count || 0) + 1;
        }

        if (Object.keys(updateFields).length > 0) {
          const { error: statsError } = await supabaseClient
            .from('campaigns')
            .update(updateFields)
            .eq('id', message.campaign_id);

          if (statsError) {
            console.error('Error updating campaign stats:', statsError);
          } else {
            console.log('Campaign stats updated:', updateFields);
          }
        }
      }
    }

    // Log the webhook for debugging
    await supabaseClient
      .from('webhook_logs')
      .insert({
        payload: payload,
        status: 'processed',
        mobile: mobile,
        transaction_id: transactionId,
        message_id: msgId,
        message_id_internal: message.id,
        campaign_id: message.campaign_id
      });

    console.log('=== WEBHOOK PROCESSED SUCCESSFULLY ===');

    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook processed successfully',
      message_id: message.id,
      status: newStatus
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}); 