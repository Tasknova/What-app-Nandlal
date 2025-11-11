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
    // Test the import
    console.log('Testing Supabase client import...');
    
    const { createClient } = await import('@supabase/supabase-js');
    console.log('Import successful, createClient:', typeof createClient);
    
    // Test creating a client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('Client created successfully');
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Supabase client import and creation working',
      clientType: typeof supabase
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in import test function:', error);
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