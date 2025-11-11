import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, mediaId } = req.query;

    if (!userId || !mediaId) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId or mediaId' 
      });
    }

    console.log('=== DOWNLOAD MEDIA API REQUEST DETAILS ===');
    console.log('User ID:', userId);
    console.log('Media ID:', mediaId);
    console.log('==========================================');

    // Get API key from database
    const { data: clientData, error: clientError } = await supabase
      .from('client_users')
      .select('whatsapp_api_key')
      .eq('user_id', userId)
      .single();

    if (clientError || !clientData) {
      console.error('Failed to get client API key:', clientError);
      return res.status(400).json({ error: 'Failed to get client credentials' });
    }

    const apiKey = clientData.whatsapp_api_key;

    // Make request to WhatsApp API
    const url = `https://theultimate.io/WAApi/media?userid=${userId}&output=json&mediaId=${mediaId}&download=true`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apiKey': apiKey,
        'Cookie': 'SERVERID=webC1'
      }
    });

    console.log('WhatsApp API Response Status:', response.status);
    console.log('WhatsApp API Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log('WhatsApp API Error Response:', errorText);
      return res.status(response.status).json({ 
        error: 'Failed to download media from WhatsApp API',
        details: errorText
      });
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
    console.error(`Download media error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
