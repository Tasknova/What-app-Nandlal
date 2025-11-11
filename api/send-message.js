// Vercel serverless function for sending WhatsApp messages
// This replaces the proxy server's /api/send-message endpoint

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
    const { userId, apiKey, wabaNumber, recipientPhone, messageContent, messageType = 'text' } = req.body;

    if (!userId || !apiKey || !wabaNumber || !recipientPhone || !messageContent) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Log request details (without sensitive data)
    console.log('=== SEND MESSAGE API REQUEST DETAILS ===');
    console.log(`User ID: ${userId}`);
    console.log(`API Key: ***${apiKey.slice(-4)}`);
    console.log(`WhatsApp Number: ${wabaNumber}`);
    console.log(`Recipient: ${recipientPhone}`);
    console.log(`Message Type: ${messageType}`);
    console.log(`Content Length: ${messageContent.length} characters`);
    console.log('========================================');

    // Prepare the request body for WhatsApp API
    const requestBody = {
      userid: userId,
      apikey: apiKey,
      wabaNumber: wabaNumber,
      mobile: recipientPhone,
      message: messageContent,
      type: messageType
    };

    // Make request to WhatsApp API
    const response = await fetch('https://theultimate.io/WAApi/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'SERVERID=webC1'
      },
      body: JSON.stringify(requestBody)
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
        messageId: data.messageId,
        transactionId: data.transactionId,
        status: data.status,
        message: 'Message sent successfully'
      });
    } else {
      return res.status(400).json({ 
        error: data.reason || 'Failed to send message',
        apiResponse: data
      });
    }

  } catch (error) {
    console.error(`Send message error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}
