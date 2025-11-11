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
    // Get all environment variables
    const envVars = {
      SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
      SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY'),
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      SUPABASE_DB_URL: Deno.env.get('SUPABASE_DB_URL'),
    };

    console.log('Available environment variables:', {
      hasUrl: !!envVars.SUPABASE_URL,
      hasAnonKey: !!envVars.SUPABASE_ANON_KEY,
      hasServiceKey: !!envVars.SUPABASE_SERVICE_ROLE_KEY,
      hasDbUrl: !!envVars.SUPABASE_DB_URL,
      urlLength: envVars.SUPABASE_URL?.length || 0,
      anonKeyLength: envVars.SUPABASE_ANON_KEY?.length || 0,
      serviceKeyLength: envVars.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      dbUrlLength: envVars.SUPABASE_DB_URL?.length || 0,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Environment variables check',
      env: {
        hasUrl: !!envVars.SUPABASE_URL,
        hasAnonKey: !!envVars.SUPABASE_ANON_KEY,
        hasServiceKey: !!envVars.SUPABASE_SERVICE_ROLE_KEY,
        hasDbUrl: !!envVars.SUPABASE_DB_URL,
        urlLength: envVars.SUPABASE_URL?.length || 0,
        anonKeyLength: envVars.SUPABASE_ANON_KEY?.length || 0,
        serviceKeyLength: envVars.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
        dbUrlLength: envVars.SUPABASE_DB_URL?.length || 0,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in environment test function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
}); 