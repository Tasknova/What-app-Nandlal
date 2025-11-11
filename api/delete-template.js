// Vercel serverless function for deleting templates
// This handles the DELETE request to remove WhatsApp templates

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
    const { 
      userId, 
      password,
      wabaNumber,
      templateName,
      language
    } = req.body;

    // Enhanced validation with detailed error messages
    const missingFields = [];
    if (!userId) missingFields.push('userId');
    if (!password) missingFields.push('password');
    if (!wabaNumber) missingFields.push('wabaNumber');
    if (!templateName) missingFields.push('templateName');

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      console.error('Received data:', {
        userId: userId || 'MISSING',
        password: password ? '***' + password.slice(-4) : 'MISSING',
        wabaNumber: wabaNumber || 'MISSING',
        templateName: templateName || 'MISSING',
        language: language || 'en'
      });
      
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.join(', ')}`,
        receivedData: {
          userId: userId || 'MISSING',
          password: password ? '***' + password.slice(-4) : 'MISSING',
          wabaNumber: wabaNumber || 'MISSING',
          templateName: templateName || 'MISSING',
          language: language || 'en'
        }
      });
    }

    // Log request details (without sensitive data)
    console.log('=== DELETE TEMPLATE API REQUEST DETAILS ===');
    console.log(`User ID: ${userId}`);
    console.log(`WhatsApp Number: ${wabaNumber}`);
    console.log(`Template Name: ${templateName}`);
    console.log(`Language: ${language || 'en'}`);
    console.log(`Password: ***${password.slice(-4)}`);
    console.log('==========================================');

    // Build URL with query parameters
    const url = new URL('https://theultimate.io/WAApi/template');
    url.searchParams.append('userid', userId);
    url.searchParams.append('password', password);
    url.searchParams.append('wabaNumber', wabaNumber);
    url.searchParams.append('output', 'json');
    // URL encode the template name to handle special characters
    url.searchParams.append('templateName', encodeURIComponent(templateName));
    url.searchParams.append('language', language || 'en');

    console.log(`Making DELETE request to: ${url.toString().replace(password, '***' + password.slice(-4))}`);

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`API Response Status: ${response.status}`);
    console.log(`API Response Headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`API Error Response: ${errorText}`);
      return res.status(response.status).json({ 
        error: `HTTP error! status: ${response.status}`,
        details: errorText,
        apiUrl: url.toString().replace(password, '***' + password.slice(-4))
      });
    }

    // Check if response has content before parsing JSON
    const responseText = await response.text();
    console.log(`API Response Text: ${responseText}`);
    
    if (!responseText || responseText.trim() === '') {
      console.log('API returned empty response');
      return res.status(400).json({ 
        error: 'Empty response from API',
        details: 'The API returned an empty response',
        apiUrl: url.toString().replace(password, '***' + password.slice(-4))
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
        details: responseText.substring(0, 500), // First 500 chars of response
        apiUrl: url.toString().replace(password, '***' + password.slice(-4))
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
        apiResponse: data,
        apiUrl: url.toString().replace(password, '***' + password.slice(-4))
      });
    }

  } catch (error) {
    console.error(`Delete template error: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
    });
  }
}
