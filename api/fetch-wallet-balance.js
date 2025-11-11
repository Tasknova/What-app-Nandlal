// Vercel serverless function for fetching wallet balance
// This handles the wallet balance API request to avoid CORS issues

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
    console.log('=== WALLET BALANCE API REQUEST DETAILS ===');
    console.log(`User ID: ${userId}`);
    console.log(`API Key: ***${apiKey.slice(-4)}`);
    console.log(`Full URL: https://theultimate.io/SMSApi/account/readstatus?userid=${userId}&output=json`);
    console.log('==========================================');

    // Make request to SMS API
    const response = await fetch(`https://theultimate.io/SMSApi/account/readstatus?userid=${userId}&output=json`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Cookie': 'PHPSESSID=m2s8rvll7rbjkhjk0jno1gb01t; SERVERNAME=s1'
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
    console.error('Error fetching wallet balance:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
