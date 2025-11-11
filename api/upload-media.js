// Vercel serverless function for uploading media
// This replaces the proxy server's /api/upload-media endpoint

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
    const { userId, apiKey, wabaNumber, mediaType, identifier, description, mediaFile } = req.body;

    if (!userId || !apiKey || !wabaNumber || !mediaType || !identifier || !mediaFile) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Log request details (without sensitive data)
    console.log('=== UPLOAD MEDIA API REQUEST DETAILS ===');
    console.log(`User ID: ${userId}`);
    console.log(`API Key: ***${apiKey.slice(-4)}`);
    console.log(`WhatsApp Number: ${wabaNumber}`);
    console.log(`Media Type: ${mediaType}`);
    console.log(`Identifier: ${identifier}`);
    console.log(`Description: ${description || 'N/A'}`);
    console.log('========================================');

    // For now, return success response as upload functionality needs to be implemented
    // This is a placeholder until proper file upload handling is implemented
    return res.json({ 
      success: true, 
      message: 'Media upload endpoint available', 
      note: 'Upload functionality to be implemented'
    });

  } catch (error) {
    console.error(`Upload media error: ${error.message}`);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}