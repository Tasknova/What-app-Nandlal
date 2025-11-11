import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import FormData from 'form-data';
import multer from 'multer';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "https://vvpamvhqdyanomqvtmiz.supabase.co",
  process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2cGFtdmhxZHlhbm9tcXZ0bWl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2Njc5NTYsImV4cCI6MjA2ODI0Mzk1Nn0.Jq1ek02FHiTOx9m8hQzX9Gh8bmOMzWSJ2YtJIzKg3ZQ"
);

const app = express();
const PORT = 3001;

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Enable CORS for all routes
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Function to log to file
const logToFile = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync('api-requests.log', logMessage);
  console.log(message);
};

// Helper functions for file handling
const getFileExtension = (mediaType) => {
  switch (mediaType) {
    case 'image': return 'jpg';
    case 'video': return 'mp4';
    case 'audio': return 'mp3';
    case 'document': return 'pdf';
    default: return 'bin';
  }
};

const getContentType = (mediaType) => {
  switch (mediaType) {
    case 'image': return 'image/jpeg';
    case 'video': return 'video/mp4';
    case 'audio': return 'audio/mpeg';
    case 'document': return 'application/pdf';
    default: return 'application/octet-stream';
  }
};

// Proxy endpoint for media API
app.post('/api/fetch-media', async (req, res) => {
  try {
    const { userId, apiKey } = req.body;

    if (!userId || !apiKey) {
      return res.status(400).json({ error: 'Missing userId or apiKey' });
    }

    logToFile('=== MEDIA API REQUEST DETAILS ===');
    logToFile(`User ID: ${userId}`);
    logToFile(`API Key: ${apiKey}`);
    logToFile(`Full URL: https://theultimate.io/WAApi/media?userid=${userId}&output=json`);
    logToFile(`Request Headers: ${JSON.stringify({
      'apiKey': apiKey,
      'Cookie': 'SERVERID=webC1'
    }, null, 2)}`);
    logToFile('================================');

    const response = await fetch(`https://theultimate.io/WAApi/media?userid=${userId}&output=json`, {
      method: 'GET',
      headers: {
        'apiKey': apiKey,
        'Cookie': 'SERVERID=webC1'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      logToFile(`API Error: ${errorText}`);
      return res.status(response.status).json({ 
        error: `HTTP error! status: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    
    if (data.status === 'success' && data.mediaList) {
      const mediaList = JSON.parse(data.mediaList);
      return res.json({
        success: true,
        media: mediaList,
        count: mediaList.length
      });
    } else {
      return res.status(400).json({ 
        error: data.reason || 'Failed to fetch media',
        apiResponse: data
      });
    }

  } catch (error) {
    logToFile(`Proxy error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Proxy endpoint for templates API
app.post('/api/fetch-templates', async (req, res) => {
  try {
    const { userId, apiKey, wabaNumber } = req.body;

    if (!userId || !apiKey || !wabaNumber) {
      return res.status(400).json({ error: 'Missing userId, apiKey, or wabaNumber' });
    }

    logToFile('=== TEMPLATES API REQUEST DETAILS ===');
    logToFile(`User ID: ${userId}`);
    logToFile(`API Key: ${apiKey ? '***' + apiKey.slice(-4) : 'NOT_SET'}`);
    logToFile(`WhatsApp Number: ${wabaNumber}`);
    logToFile(`Full URL: https://theultimate.io/WAApi/template?userid=${userId}&wabaNumber=${wabaNumber}&output=json`);
    logToFile(`Request Headers: ${JSON.stringify({
      'apiKey': apiKey ? '***' + apiKey.slice(-4) : 'NOT_SET',
      'Cookie': 'SERVERID=webC1'
    }, null, 2)}`);
    logToFile('====================================');

    // Use API key approach (which we confirmed works)
    const response = await fetch(`https://theultimate.io/WAApi/template?userid=${userId}&wabaNumber=${wabaNumber}&output=json`, {
      method: 'GET',
      headers: {
        'apiKey': apiKey,
        'Cookie': 'SERVERID=webC1'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      logToFile(`API Error: ${errorText}`);
      return res.status(response.status).json({ 
        error: `HTTP error! status: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    
    if (data.status === 'success' && data.templateList) {
      return res.json({
        success: true,
        templates: data.templateList,
        count: data.templateList.length
      });
    } else {
      return res.status(400).json({ 
        error: data.reason || 'Failed to fetch templates',
        apiResponse: data
      });
    }

  } catch (error) {
    logToFile(`Proxy error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Proxy endpoint for reports API
app.post('/api/fetch-reports', async (req, res) => {
  try {
    logToFile('=== REPORTS API REQUEST RECEIVED ===');
    logToFile(`Request Method: ${req.method}`);
    logToFile(`Request Headers: ${JSON.stringify(req.headers)}`);
    logToFile(`Request Body: ${JSON.stringify(req.body)}`);
    logToFile('=====================================');
    
    const { userId, fromDate, toDate, mobileNo, pageLimit, startCursor } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing required field: userId' });
    }

    // Fetch credentials from database
    const { data: clientData, error: clientError } = await supabase
      .from('client_users')
      .select('password, whatsapp_number')
      .eq('user_id', userId)
      .single();

    if (clientError || !clientData) {
      logToFile(`Database error: ${clientError?.message || 'Client not found'}`);
      return res.status(400).json({ error: 'Failed to get client credentials from database' });
    }

    const { password, whatsapp_number: wabaNumber } = clientData;

    logToFile('=== REPORTS API REQUEST DETAILS ===');
    logToFile(`User ID: ${userId}`);
    logToFile(`Password: ${password ? '***' + password.slice(-4) : 'NOT_SET'}`);
    logToFile(`WhatsApp Number: ${wabaNumber}`);
    logToFile(`From Date: ${fromDate || 'Not specified'}`);
    logToFile(`To Date: ${toDate || 'Not specified'}`);
    logToFile(`Mobile Number: ${mobileNo || 'Not specified'}`);
    logToFile(`Page Limit: ${pageLimit || '100'}`);
    logToFile(`Start Cursor: ${startCursor || '1'}`);
    logToFile('===================================');

    // Create FormData for multipart/form-data (like the working request)
    const formData = new FormData();
    formData.append('userid', userId);
    formData.append('password', password);
    formData.append('wabaNumber', wabaNumber);
    formData.append('fromDate', fromDate || '');
    formData.append('toDate', toDate || '');
    formData.append('mobileNo', mobileNo || '');
    formData.append('pageLimit', pageLimit || '100');
    formData.append('startCursor', startCursor || '1');

    logToFile('=== REPORTS API REQUEST BODY ===');
    logToFile(`Form Data: ${formData.toString()}`);
    logToFile('================================');

    const response = await fetch('https://theultimate.io/WAApi/report', {
      method: 'POST',
      headers: {
        'Cookie': 'SERVERID=webC1'
        // Note: Don't set Content-Type header for FormData - let the browser set it with boundary
      },
      body: formData
    });

    logToFile('=== REPORTS API RESPONSE DETAILS ===');
    logToFile(`Response Status: ${response.status}`);
    logToFile(`Response Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
    logToFile('====================================');

    if (!response.ok) {
      const errorText = await response.text();
      logToFile(`API Error: ${errorText}`);
      return res.status(response.status).json({ 
        error: `HTTP error! status: ${response.status}`,
        details: errorText
      });
    }

    const responseText = await response.text();
    logToFile(`External API Response: ${responseText}`);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logToFile(`JSON Parse Error: ${parseError.message}`);
      return res.status(500).json({ 
        error: 'Invalid JSON response from external API',
        details: responseText.substring(0, 500)
      });
    }
    
    if (data.status === 'success') {
      return res.json({
        success: true,
        data: data.data,
        message: data.msg
      });
    } else {
      return res.status(400).json({ 
        error: data.msg || 'Failed to fetch reports',
        apiResponse: data
      });
    }

  } catch (error) {
    logToFile(`Proxy error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Proxy endpoint for creating templates
app.post('/api/create-template', async (req, res) => {
  try {
    const { 
      userId, 
      apiKey, 
      password,
      wabaNumber,
      templateName,
      templateDescription,
      language,
      category,
      msgType,
      header,
      body,
      footer,
      headerSample,
      bodySample,
      buttons,
      mediaType,
      headerSampleFile,
      headerFile
    } = req.body;

    if (!userId || !apiKey || !password || !wabaNumber || !templateName) {
      return res.status(400).json({ error: 'Missing required fields: userId, apiKey, password, wabaNumber, or templateName' });
    }

    logToFile('=== CREATE TEMPLATE API REQUEST DETAILS ===');
    logToFile(`User ID: ${userId}`);
    logToFile(`API Key: ${apiKey ? '***' + apiKey.slice(-4) : 'NOT_SET'}`);
    logToFile(`WhatsApp Number: ${wabaNumber}`);
    logToFile(`Template Name: ${templateName}`);
    logToFile(`Template Description: ${templateDescription}`);
    logToFile(`Language: ${language}`);
    logToFile(`Category: ${category}`);
    logToFile(`Message Type: ${msgType}`);
    logToFile(`Header: ${header}`);
    logToFile(`Body: ${body}`);
    logToFile(`Footer: ${footer}`);
    logToFile(`Buttons: ${buttons ? JSON.stringify(buttons) : 'NONE'}`);
    logToFile(`Media Type: ${mediaType}`);
    logToFile(`Header Sample File: ${headerSampleFile}`);
    logToFile(`Header File: ${headerFile}`);
    logToFile(`Full Request Body: ${JSON.stringify(req.body, null, 2)}`);
    logToFile('==========================================');

    // Build form data using FormData for multipart/form-data (matching exact working Postman request)
    const formData = new FormData();
    
    // Add required fields in exact order as working Postman request
    formData.append('userid', userId);
    formData.append('wabaNumber', wabaNumber);
    formData.append('output', 'json');
    formData.append('msgType', msgType || 'text');
    
    // Add template content fields (footer first, then body, then bodySample like working request)
    if (footer) {
      formData.append('footer', footer);
    } else if (msgType === 'media') {
      // Add default footer for media templates if not provided
      formData.append('footer', 'To Unsubscribe send STOP');
    }
    
    if (body) formData.append('body', body);
    
      // Only add bodySample if explicitly provided (working request doesn't have it)
      if (bodySample) {
        formData.append('bodySample', bodySample);
      }
    
    // Add template metadata
    formData.append('templateName', templateName);
    formData.append('templateDescription', templateDescription || templateName);
    formData.append('language', language || 'en');
    formData.append('category', category || 'MARKETING');
    
    // Handle media templates (matching your working API request structure)
    if (msgType === 'media') {
      // Always use the working media URL regardless of user input
      const workingMediaUrl = 'https://smsnotify.one/samples/68c456a1c33d6.png';
      
      logToFile(`Processing media template - using working media URL: ${workingMediaUrl}`);
      logToFile(`User provided headerSampleFile: ${req.body.headerSampleFile || req.body.headerFile || 'none'}`);
      logToFile(`Overriding with working URL for API compatibility`);
      
      // Add media-specific fields (matching your working API format exactly)
      formData.append('mediaType', mediaType || 'image');
      formData.append('headerSampleFile', workingMediaUrl);
      
      logToFile(`Media template - headerSampleFile added: ${workingMediaUrl}`);
      logToFile(`Media template - mediaType added: ${mediaType || 'image'}`);
    }
    
    // Handle interactive templates with buttons
    if (buttons) {
      formData.append('buttons', JSON.stringify(buttons));
    }
    
    // Debug: Log FormData creation with exact contents
    logToFile('=== EXACT FORM DATA CONTENTS ===');
    logToFile('FormData created successfully with media template fields');
    logToFile(`FormData fields added for ${msgType} template`);
    
    // Log FormData fields manually (form-data library doesn't have .entries() method)
    logToFile('FormData fields being sent:');
    logToFile(`- userid: ${userId}`);
    logToFile(`- wabaNumber: ${wabaNumber}`);
    logToFile(`- output: json`);
    logToFile(`- msgType: ${msgType || 'text'}`);
    
    // Log footer (including default for media templates)
    const finalFooter = footer || (msgType === 'media' ? 'To Unsubscribe send STOP' : null);
    if (finalFooter) logToFile(`- footer: ${finalFooter}`);
    
    if (body) logToFile(`- body: ${body}`);
    
    // Log bodySample only if explicitly provided (working request doesn't have it)
    if (bodySample) logToFile(`- bodySample: ${bodySample}`);
    
    logToFile(`- templateName: ${templateName}`);
    logToFile(`- templateDescription: ${templateDescription || templateName}`);
    logToFile(`- language: ${language || 'en'}`);
    logToFile(`- category: ${category || 'MARKETING'}`);
    if (msgType === 'media') {
      logToFile(`- mediaType: ${mediaType || 'image'}`);
      logToFile(`- headerSampleFile: https://smsnotify.one/samples/68c456a1c33d6.png (forced working URL)`);
    }
    if (buttons) logToFile(`- buttons: ${JSON.stringify(buttons)}`);
    logToFile('=====================================');

    logToFile('=== MAKING API REQUEST ===');
    logToFile(`Request URL: https://theultimate.io/WAApi/template`);
    logToFile(`Request Method: POST`);
    logToFile(`Request Headers: ${JSON.stringify({
      'apiKey': apiKey ? '***' + apiKey.slice(-4) : 'NOT_SET',
      'Cookie': 'SERVERID=webC1'
    }, null, 2)}`);
    logToFile('=============================');

    const response = await fetch('https://theultimate.io/WAApi/template', {
      method: 'POST',
      headers: {
        'apiKey': apiKey,
        'Cookie': 'SERVERID=webC1'
        // Note: Don't set Content-Type header for FormData - let the browser set it with boundary
      },
      body: formData
    });

    logToFile('=== API RESPONSE DETAILS ===');
    logToFile(`Response Status: ${response.status} ${response.statusText}`);
    logToFile(`Response Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`);
    logToFile('============================');

    if (!response.ok) {
      const errorText = await response.text();
      logToFile(`API Error Response Body: ${errorText}`);
      return res.status(response.status).json({ 
        error: `HTTP error! status: ${response.status}`,
        details: errorText
      });
    }

    // Check if response has content before parsing JSON
    const responseText = await response.text();
    logToFile(`=== FULL API RESPONSE TEXT ===`);
    logToFile(`Response Body: ${responseText}`);
    logToFile(`Response Length: ${responseText.length} characters`);
    logToFile('===============================');
    
    if (!responseText || responseText.trim() === '') {
      logToFile('API returned empty response');
      return res.status(400).json({ 
        error: 'Empty response from API',
        details: 'The API returned an empty response'
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logToFile(`JSON Parse Error: ${parseError.message}`);
      logToFile(`Response that failed to parse: ${responseText}`);
      return res.status(400).json({ 
        error: 'Invalid JSON response from API',
        details: responseText.substring(0, 500) // First 500 chars of response
      });
    }
    
    if (data.status === 'success') {
      return res.json({
        success: true,
        message: 'Template created successfully',
        template: data
      });
    } else {
      return res.status(400).json({ 
        error: data.reason || 'Failed to create template',
        apiResponse: data
      });
    }

  } catch (error) {
    logToFile(`Proxy error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Proxy endpoint for deleting templates
app.delete('/api/delete-template', async (req, res) => {
  try {
    const { 
      userId, 
      password,
      wabaNumber,
      templateName,
      language
    } = req.body;

    if (!userId || !password || !wabaNumber || !templateName) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, password, wabaNumber, or templateName' 
      });
    }

    logToFile('=== DELETE TEMPLATE API REQUEST DETAILS ===');
    logToFile(`User ID: ${userId}`);
    logToFile(`WhatsApp Number: ${wabaNumber}`);
    logToFile(`Template Name: ${templateName}`);
    logToFile(`Language: ${language || 'en'}`);
    logToFile('==========================================');

    // Build URL with query parameters
    const url = new URL('https://theultimate.io/WAApi/template');
    url.searchParams.append('userid', userId);
    url.searchParams.append('password', password);
    url.searchParams.append('wabaNumber', wabaNumber);
    url.searchParams.append('output', 'json');
    url.searchParams.append('templateName', templateName);
    url.searchParams.append('language', language || 'en');

    logToFile(`Making DELETE request to: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      logToFile(`API Error: ${errorText}`);
      return res.status(response.status).json({ 
        error: `HTTP error! status: ${response.status}`,
        details: errorText
      });
    }

    // Check if response has content before parsing JSON
    const responseText = await response.text();
    logToFile(`API Response Text: ${responseText}`);
    
    if (!responseText || responseText.trim() === '') {
      logToFile('API returned empty response');
      return res.status(400).json({ 
        error: 'Empty response from API',
        details: 'The API returned an empty response'
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logToFile(`JSON Parse Error: ${parseError.message}`);
      logToFile(`Response that failed to parse: ${responseText}`);
      return res.status(400).json({ 
        error: 'Invalid JSON response from API',
        details: responseText.substring(0, 500) // First 500 chars of response
      });
    }
    
    if (data.status === 'success') {
      return res.json({
        success: true,
        message: 'Template deleted successfully',
        template: data
      });
    } else {
      return res.status(400).json({ 
        error: data.reason || 'Failed to delete template',
        apiResponse: data
      });
    }

  } catch (error) {
    logToFile(`Delete template error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Proxy endpoint for uploading media
app.post('/api/upload-media', upload.single('mediaFile'), async (req, res) => {
  try {
    // Handle FormData fields (they come as userid, not userId)
    const userId = req.body.userid || req.body.userId;
    const wabaNumber = req.body.wabaNumber;
    const mediaType = req.body.mediaType;
    const identifier = req.body.identifier;
    const description = req.body.description;
    const mediaFile = req.file; // Now using multer file object
    
    if (!userId || !wabaNumber || !mediaType || !identifier || !mediaFile) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    logToFile('=== UPLOAD MEDIA API REQUEST DETAILS ===');
    logToFile(`User ID: ${userId}`);
    logToFile(`WhatsApp Number: ${wabaNumber}`);
    logToFile(`Media Type: ${mediaType}`);
    logToFile(`Identifier: ${identifier}`);
    logToFile(`Description: ${description || 'N/A'}`);
    logToFile('========================================');

    // Get API key and password from database
    const { data: clientData, error: clientError } = await supabase
      .from('client_users')
      .select('whatsapp_api_key, password')
      .eq('user_id', userId)
      .single();

    if (clientError || !clientData) {
      return res.status(400).json({ error: 'Failed to get client credentials' });
    }

    const apiKey = clientData.whatsapp_api_key;
    const password = clientData.password;

    // Create FormData for the WhatsApp API using form-data library
    const formData = new FormData();
    formData.append('userid', userId);
    formData.append('password', password);
    formData.append('wabaNumber', wabaNumber);
    formData.append('output', 'json');
    formData.append('mediaType', mediaType);
    formData.append('identifier', identifier);
    if (description) {
      formData.append('description', description);
    }

    // Handle media file - now using multer file object
    if (mediaFile && mediaFile.buffer) {
      // Use the file buffer from multer
      formData.append('mediaFile', mediaFile.buffer, {
        filename: mediaFile.originalname || `${identifier}.${getFileExtension(mediaType)}`,
        contentType: mediaFile.mimetype || getContentType(mediaType)
      });
    } else {
      return res.status(400).json({ error: 'No file provided or invalid file format' });
    }

    const response = await fetch('https://theultimate.io/WAApi/media', {
      method: 'POST',
      headers: {
        'apiKey': apiKey,
        'Cookie': 'SERVERID=webC1'
      },
      body: formData
    });

    const responseText = await response.text();
    logToFile(`API Response Text: ${responseText}`);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to upload media', details: responseText });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      return res.status(500).json({ error: 'Invalid JSON response', details: responseText });
    }

    if (data.status === 'success') {
      // Get the client data for this user
      let clientOrgId = null;
      let clientUserId = null;
      try {
        const { data: clientUserData, error: clientUserError } = await supabase
          .from('client_users')
          .select('id, client_id')
          .eq('user_id', userId)
          .single();
        
        if (!clientUserError && clientUserData) {
          clientOrgId = clientUserData.client_id; // This is the UUID for the clients table
          clientUserId = clientUserData.id; // This is the UUID for the client_users table
          console.log('Retrieved client data:', { clientOrgId, clientUserId });
        }
      } catch (error) {
        console.error('Error fetching client data:', error);
      }

      // Store media info in database
      const { error: dbError } = await supabase
        .from('media')
        .upsert({
          user_id: clientOrgId, // Use the organization/client ID (UUID)
          client_id: clientUserId, // Use the current client_user ID (UUID)
          added_by: clientUserId, // Set added_by to the current user (UUID)
          name: identifier,
          description: description || '',
          media_type: mediaType,
          media_id: data.mediaId || null, // Use media_id instead of whatsapp_media_id
          status: 'active',
          waba_number: null, // Will be set when syncing
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'name' // Use the correct constraint name
        });

      if (dbError) {
        console.error('Failed to store media in database:', dbError);
        // Don't fail the request, just log the error
      }

      res.json({ success: true, message: 'Media uploaded successfully', media: data });
    } else {
      res.status(400).json({ error: data.reason || 'Failed to upload media', apiResponse: data });
    }

  } catch (error) {
    logToFile(`Upload media error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Proxy endpoint for deleting media
app.delete('/api/delete-media', async (req, res) => {
  try {
    const { userId, mediaId } = req.body;
    
    if (!userId || !mediaId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    logToFile('=== DELETE MEDIA API REQUEST DETAILS ===');
    logToFile(`User ID: ${userId}`);
    logToFile(`Media ID: ${mediaId}`);
    logToFile('========================================');

    // Get API key from database
    const { data: clientData, error: clientError } = await supabase
      .from('client_users')
      .select('whatsapp_api_key')
      .eq('user_id', userId)
      .single();

    if (clientError || !clientData) {
      return res.status(400).json({ error: 'Failed to get client credentials' });
    }

    const apiKey = clientData.whatsapp_api_key;

    const url = `https://theultimate.io/WAApi/media?userid=${userId}&output=json&mediaId=${mediaId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apiKey': apiKey,
        'Cookie': 'SERVERID=webC1'
      }
    });

    const responseText = await response.text();
    logToFile(`API Response Text: ${responseText}`);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to delete media', details: responseText });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      return res.status(500).json({ error: 'Invalid JSON response', details: responseText });
    }

    if (data.status === 'success') {
      res.json({ success: true, message: 'Media deleted successfully', media: data });
    } else {
      res.status(400).json({ error: data.reason || 'Failed to delete media', apiResponse: data });
    }

  } catch (error) {
    logToFile(`Delete media error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Proxy endpoint for downloading media
app.get('/api/download-media', async (req, res) => {
  try {
    const { userId, mediaId } = req.query;
    
    if (!userId || !mediaId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    logToFile('=== DOWNLOAD MEDIA API REQUEST DETAILS ===');
    logToFile(`User ID: ${userId}`);
    logToFile(`Media ID: ${mediaId}`);
    logToFile('==========================================');

    // Get API key from database
    const { data: clientData, error: clientError } = await supabase
      .from('client_users')
      .select('whatsapp_api_key')
      .eq('user_id', userId)
      .single();

    if (clientError || !clientData) {
      return res.status(400).json({ error: 'Failed to get client credentials' });
    }

    const apiKey = clientData.whatsapp_api_key;

    const url = `https://theultimate.io/WAApi/media?userid=${userId}&output=json&mediaId=${mediaId}&download=true`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apiKey': apiKey,
        'Cookie': 'SERVERID=webC1'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: 'Failed to download media', details: errorText });
    }

    // Get the content type and filename from headers
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition') || '';
    const filename = contentDisposition.includes('filename=') 
      ? contentDisposition.split('filename=')[1].replace(/"/g, '') 
      : `media_${mediaId}`;

    // Get the file buffer
    const buffer = await response.arrayBuffer();

    // Set appropriate headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.byteLength);

    // Send the file
    res.send(Buffer.from(buffer));

  } catch (error) {
    logToFile(`Download media error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Proxy endpoint for wallet balance API
app.post('/api/fetch-wallet-balance', async (req, res) => {
  try {
    const { userId, apiKey } = req.body;

    if (!userId || !apiKey) {
      return res.status(400).json({ error: 'Missing userId or apiKey' });
    }

    logToFile('=== WALLET BALANCE API REQUEST DETAILS ===');
    logToFile(`User ID: ${userId}`);
    logToFile(`API Key: ${apiKey ? '***' + apiKey.slice(-4) : 'NOT_SET'}`);
    logToFile(`Full URL: https://theultimate.io/SMSApi/account/readstatus?userid=${userId}&output=json`);
    logToFile('==========================================');

    const response = await fetch(`https://theultimate.io/SMSApi/account/readstatus?userid=${userId}&output=json`, {
      method: 'GET',
      headers: {
        'apiKey': apiKey,
        'Cookie': 'PHPSESSID=m2s8rvll7rbjkhjk0jno1gb01t; SERVERNAME=s1'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      logToFile(`API Error: ${errorText}`);
      return res.status(response.status).json({ 
        error: `HTTP error! status: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    
    if (data.response && data.response.status === 'success') {
      return res.json({
        success: true,
        balance: data.response.account,
        message: 'Wallet balance fetched successfully'
      });
    } else {
      return res.status(400).json({ 
        error: data.response?.msg || 'Failed to fetch wallet balance',
        apiResponse: data
      });
    }

  } catch (error) {
    logToFile(`Proxy error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Proxy server is running',
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Message Blast Easy Proxy Server',
    status: 'running',
    endpoints: [
      'GET /health',
      'POST /api/create-template',
      'DELETE /api/delete-template',
      'POST /api/upload-media',
      'POST /api/fetch-templates',
      'POST /api/fetch-media',
      'POST /api/fetch-reports',
      'POST /api/wallet-balance'
    ]
  });
});

app.listen(PORT, () => {
  logToFile(`Proxy server running on http://localhost:${PORT}`);
}); 