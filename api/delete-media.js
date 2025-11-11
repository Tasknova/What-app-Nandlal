// Vercel serverless function for deleting media
// This replaces the proxy server's /api/delete-media endpoint

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

  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, mediaId, apiKey } = req.body;

    if (!userId || !mediaId || !apiKey) {
      return res.status(400).json({ error: 'Missing userId, mediaId, or apiKey' });
    }

    // Log request details (without sensitive data)
    console.log('=== DELETE MEDIA API REQUEST DETAILS ===');
    console.log(`User ID: ${userId}`);
    console.log(`Media ID: ${mediaId}`);
    console.log(`API Key: ***${apiKey.slice(-4)}`);
    console.log('========================================');

    // Make request to WhatsApp API
    const url = `https://theultimate.io/WAApi/media?userid=${userId}&output=json&mediaId=${mediaId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apiKey': apiKey,
        'Cookie': 'SERVERID=webC1'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`API Error: ${errorText}`);
      return res.status(response.status).json({ 
        error: `HTTP error! status: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    
    if (data.status === 'success') {
      return res.json({ 
        success: true, 
        message: 'Media deleted successfully', 
        media: data 
      });
    } else {
      return res.status(400).json({ 
        error: data.reason || 'Failed to delete media', 
        apiResponse: data 
      });
    }

  } catch (error) {
    console.error(`Delete media error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}