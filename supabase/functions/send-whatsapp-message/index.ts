import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppMessageRequest {
  recipient_phone: string;
  message_content: string;
  message_type: string;
  template_name?: string;
  campaign_id?: string;
  media_id?: string;
  media_type?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing authorization header'
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract client session token
    const token = authHeader.replace('Bearer ', '');
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 10) + '...');
    
    // Validate client session with improved error handling
    const { data: sessionData, error: sessionError } = await supabaseClient
      .from('client_sessions')
      .select(`
        id,
        client_id,
        expires_at,
        client_users!inner(
          id,
          email,
          business_name,
          whatsapp_api_key,
          whatsapp_number,
          user_id,
          is_active
        )
      `)
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    console.log('Session query result:', { 
      sessionFound: !!sessionData, 
      sessionError: sessionError?.message,
      expiresAt: sessionData?.expires_at 
    });

    if (sessionError) {
      console.error('Session validation error:', sessionError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Session validation failed: ' + sessionError.message
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!sessionData) {
      console.error('No valid session found for token');
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid or expired session'
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const client = sessionData.client_users;
    if (!client.is_active) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Client account is not active'
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get the request body
    const { recipient_phone, message_content, message_type, template_name, campaign_id, media_id, media_type }: WhatsAppMessageRequest = await req.json();

    // Validate required fields
    if (!recipient_phone || !message_content) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: recipient_phone and message_content'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create message record in database
    const { data: messageRecord, error: messageError } = await supabaseClient
      .from('messages')
      .insert({
        user_id: client.id,
        client_id: client.id, // Add client_id for consistency
        recipient_phone,
        message_content,
        message_type: message_type || 'text',
        campaign_id,
        status: 'pending'
      })
      .select()
      .single();

    if (messageError) {
      console.error('Message creation error:', messageError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create message record: ' + messageError.message
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get client's WhatsApp API key and number
    if (!client.whatsapp_api_key) {
      return new Response(JSON.stringify({
        success: false,
        error: 'WhatsApp API key not configured. Please add your API key in Settings.'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!client.whatsapp_number) {
      return new Response(JSON.stringify({
        success: false,
        error: 'WhatsApp number not configured. Please add your WhatsApp number in Settings.'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Determine if this is a media message
    const isMediaMessage = media_id && media_type;
    const msgType = isMediaMessage ? 'media' : 'text';

    // Create FormData for the theultimate.io WhatsApp API
    const formData = new FormData();
    formData.append('userid', client.user_id || client.id);
    formData.append('msg', message_content);
    formData.append('wabaNumber', client.whatsapp_number);
    formData.append('output', 'json');
    formData.append('mobile', recipient_phone);
    formData.append('sendMethod', 'quick');
    formData.append('msgType', msgType);
    
    // Add template name if provided
    if (template_name) {
      formData.append('templateName', template_name);
    }

    // Add media fields if this is a media message
    if (isMediaMessage) {
      formData.append('mediaId', media_id);
      formData.append('mediaType', media_type);
    }

    // Log the complete request details
    console.log('=== WHATSAPP API REQUEST DETAILS ===');
    console.log('URL:', 'https://theultimate.io/WAApi/send');
    console.log('Method:', 'POST');
    console.log('Headers:', {
      'apikey': client.whatsapp_api_key ? '***' + client.whatsapp_api_key.slice(-4) : 'NOT_SET',
      'Cookie': 'SERVERID=webC1'
    });
    console.log('FormData Body:');
    console.log('  userid:', client.user_id || client.id);
    console.log('  msg:', message_content);
    console.log('  wabaNumber:', client.whatsapp_number);
    console.log('  output:', 'json');
    console.log('  mobile:', recipient_phone);
    console.log('  sendMethod:', 'quick');
    console.log('  msgType:', msgType);
    console.log('  templateName:', template_name || 'NOT_PROVIDED');
    if (isMediaMessage) {
      console.log('  mediaId:', media_id);
      console.log('  mediaType:', media_type);
    }
    console.log('=== END REQUEST DETAILS ===');
    
    // Log the actual FormData for debugging
    console.log('=== ACTUAL FORMDATA CONTENTS ===');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value);
    }
    console.log('=== END FORMDATA CONTENTS ===');

    // Send message via theultimate.io API
    const whatsappResponse = await fetch('https://theultimate.io/WAApi/send', {
      method: 'POST',
      headers: {
        'apikey': client.whatsapp_api_key,
        'Cookie': 'SERVERID=webC1'
      },
      body: formData
    });

    const whatsappResult = await whatsappResponse.text();
    
    // Log the complete response details
    console.log('=== WHATSAPP API RESPONSE DETAILS ===');
    console.log('Response Status:', whatsappResponse.status);
    console.log('Response Status Text:', whatsappResponse.statusText);
    console.log('Response Headers:', Object.fromEntries(whatsappResponse.headers.entries()));
    console.log('Raw Response Body:', whatsappResult);
    
    let parsedResult;
    try {
      parsedResult = JSON.parse(whatsappResult);
      console.log('Parsed JSON Response:', parsedResult);
    } catch (e) {
      parsedResult = { status: 'error', message: whatsappResult };
      console.log('Failed to parse JSON, treating as text:', whatsappResult);
    }
    console.log('=== END RESPONSE DETAILS ===');

    // Update message status based on response
    const updateData: any = {
      sent_at: new Date().toISOString()
    };

    if (whatsappResponse.ok && parsedResult.status === 'success') {
      updateData.status = 'sent';
    } else {
      updateData.status = 'failed';
      updateData.error_message = parsedResult.message || parsedResult.reason || 'Failed to send message';
    }

    // Update message record with result
    const { error: updateError } = await supabaseClient
      .from('messages')
      .update(updateData)
      .eq('id', messageRecord.id);

    if (updateError) {
      console.error('Message update error:', updateError);
    }

    console.log('Message processed successfully:', messageRecord.id);

    return new Response(JSON.stringify({
      success: updateData.status === 'sent',
      message: updateData.status === 'sent' ? 'Message sent successfully' : 'Message failed to send',
      message_id: messageRecord.id,
      status: updateData.status,
      whatsapp_response: parsedResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== EDGE FUNCTION ERROR ===');
    console.error('Error in send-whatsapp-message function:', error);
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error?.constructor?.name);
    console.error('Error message:', error.message || 'No message');
    console.error('Error stack:', error.stack || 'No stack');
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    console.error('=== END ERROR DETAILS ===');
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error',
      errorType: error.constructor?.name || 'Unknown',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});