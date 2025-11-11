// Vercel serverless function for creating templates
// This replaces the proxy server's /api/create-template endpoint

import fetch from 'node-fetch';
import FormData from 'form-data';

export default async function handler(req, res) {
  // Enable CORS with more comprehensive headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    // Log request details (without sensitive data)
    console.log('=== CREATE TEMPLATE API REQUEST DETAILS ===');
    console.log(`User ID: ${userId}`);
    console.log(`API Key: ***${apiKey.slice(-4)}`);
    console.log(`WhatsApp Number: ${wabaNumber}`);
    console.log(`Template Name: ${templateName}`);
    console.log(`Template Description: ${templateDescription}`);
    console.log(`Language: ${language}`);
    console.log(`Category: ${category}`);
    console.log(`Message Type: ${msgType}`);
    console.log(`Header: ${header}`);
    console.log(`Body: ${body}`);
    console.log(`Footer: ${footer}`);
    console.log(`Buttons: ${buttons ? JSON.stringify(buttons) : 'NONE'}`);
    console.log(`Media Type: ${mediaType}`);
    console.log('==========================================');

    // Build form data using FormData for multipart/form-data
    const formData = new FormData();
    formData.append('userid', userId);
    formData.append('password', password);
    formData.append('wabaNumber', wabaNumber);
    formData.append('output', 'json');
    formData.append('templateName', templateName);
    
    if (templateDescription) formData.append('templateDescription', templateDescription);
    if (language) formData.append('language', language);
    if (category) formData.append('category', category);
    if (msgType) formData.append('msgType', msgType);
    if (header) formData.append('header', header);
    if (body) formData.append('body', body);
    if (footer) formData.append('footer', footer);
    if (headerSample) formData.append('headerSample', headerSample);
    if (bodySample) formData.append('bodySample', bodySample);
    if (buttons) formData.append('buttons', JSON.stringify(buttons));
    
    // For media templates, include headerSampleFile parameter (matching WhatsApp API spec)
    if (msgType === 'media') {
      const headerSampleFileValue = headerSampleFile || headerFile; // Support both field names for backward compatibility
      console.log('Processing media template with headerSampleFile:', headerSampleFileValue);
      
      if (headerSampleFileValue && headerSampleFileValue.trim()) {
        // Add media-specific fields (matching the working curl format)
        formData.append('mediaType', mediaType || 'image');
        formData.append('headerSampleFile', headerSampleFileValue.trim());
        
        console.log(`Media template - mediaType added: ${mediaType || 'image'}`);
        console.log(`Media template - headerSampleFile added: ${headerSampleFileValue.trim()}`);
        
        // Debug: Log FormData creation (form-data library doesn't have entries() method)
        console.log('=== FORM DATA CONTENTS ===');
        console.log('FormData created successfully with media template fields');
        console.log(`FormData fields added for ${msgType} template`);
        console.log('==========================');
      } else {
        console.log('Media template - no headerSampleFile provided, this will cause an error');
        return res.status(400).json({ 
          error: 'Missing headerSampleFile for media template',
          details: 'Media templates require a headerSampleFile parameter (URL to the media file)'
        });
      }
    }

    const response = await fetch('https://theultimate.io/WAApi/template', {
      method: 'POST',
      headers: {
        'apiKey': apiKey,
        'Cookie': 'SERVERID=webC1'
        // Note: Don't set Content-Type header for FormData - let the browser set it with boundary
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`API Error: ${errorText}`);
      return res.status(response.status).json({ 
        error: `HTTP error! status: ${response.status}`,
        details: errorText
      });
    }

    // Check if response has content before parsing JSON
    const responseText = await response.text();
    console.log(`API Response Text: ${responseText}`);
    
    if (!responseText || responseText.trim() === '') {
      console.log('API returned empty response');
      return res.status(400).json({ 
        error: 'Empty response from API',
        details: 'The API returned an empty response'
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.log(`JSON Parse Error: ${parseError.message}`);
      console.log(`Response that failed to parse: ${responseText}`);
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
    console.error(`Proxy error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
