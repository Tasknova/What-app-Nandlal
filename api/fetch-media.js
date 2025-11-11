// Vercel serverless function for fetching media
// This replaces the proxy server's /api/fetch-media endpoint

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
    const { userId, apiKey } = req.body;

    if (!userId || !apiKey) {
      return res.status(400).json({ error: 'Missing userId or apiKey' });
    }

    // Log request details (without sensitive data)
    console.log('=== MEDIA API REQUEST DETAILS ===');
    console.log(`User ID: ${userId}`);
    console.log(`API Key: ***${apiKey.slice(-4)}`);
    console.log(`Full URL: https://theultimate.io/WAApi/media?userid=${userId}&output=json`);
    console.log('================================');

    // Make request to WhatsApp API
    const response = await fetch(`https://theultimate.io/WAApi/media?userid=${userId}&output=json`, {
      method: 'GET',
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
    console.error(`Proxy error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
