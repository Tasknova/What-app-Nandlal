import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface MediaItem {
  identifier: string;
  creationTime: number;
  description: string;
  mediaType: 'image' | 'video' | 'doc' | 'audio';
  mediaId: string;
  wabaNumber: number;
  status: string;
}

interface MediaResponse {
  status: string;
  mediaList: string;
  statusCode: string;
  reason: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    // Parse request body
    const { userId, apiKey } = await req.json();

    if (!userId || !apiKey) {
      return new Response(JSON.stringify({ 
        error: 'Missing userId or apiKey' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Make the API call to the WhatsApp API
    const response = await fetch(`https://theultimate.io/WAApi/media?userid=${userId}&output=json`, {
      method: 'GET',
      headers: {
        'apiKey': apiKey,
        'Cookie': 'SERVERID=webC1'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      return new Response(JSON.stringify({ 
        error: `HTTP error! status: ${response.status}`,
        details: errorText
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const data: MediaResponse = await response.json();
    
    if (data.status === 'success' && data.mediaList) {
      const mediaList: MediaItem[] = JSON.parse(data.mediaList);
      return new Response(JSON.stringify({
        success: true,
        media: mediaList,
        count: mediaList.length
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } else {
      return new Response(JSON.stringify({ 
        error: data.reason || 'Failed to fetch media',
        apiResponse: data
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}); 