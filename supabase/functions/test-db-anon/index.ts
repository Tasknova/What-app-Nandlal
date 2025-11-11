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
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing environment variables'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    // Create Supabase client with anon key
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
      message: 'Database connection working with anon key',
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