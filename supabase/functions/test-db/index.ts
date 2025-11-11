import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log environment variables (truncated for security)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceKey,
      urlLength: supabaseUrl?.length || 0,
      keyLength: supabaseServiceKey?.length || 0
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing environment variables',
        env: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseServiceKey
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    // Create Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test a simple database query
    const { data, error } = await supabase
      .from('campaigns')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Database error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Database connection working',
      data: data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in database test function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
}); 