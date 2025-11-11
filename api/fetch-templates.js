// Vercel serverless function for fetching templates
// This replaces the proxy server's /api/fetch-templates endpoint

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
    const { userId, apiKey, wabaNumber } = req.body;

    if (!userId || !apiKey || !wabaNumber) {
      return res.status(400).json({ error: 'Missing userId, apiKey, or wabaNumber' });
    }

    // Log request details (without sensitive data)
    console.log('=== TEMPLATES API REQUEST DETAILS ===');
    console.log(`User ID: ${userId}`);
    console.log(`API Key: ***${apiKey.slice(-4)}`);
    console.log(`WhatsApp Number: ${wabaNumber}`);
    console.log(`Full URL: https://theultimate.io/WAApi/template?userid=${userId}&wabaNumber=${wabaNumber}&output=json`);
    console.log('====================================');

    // Make request to WhatsApp API
    const response = await fetch(`https://theultimate.io/WAApi/template?userid=${userId}&wabaNumber=${wabaNumber}&output=json`, {
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
    console.error(`Proxy error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
