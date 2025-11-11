import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { clientId, action, mediaData } = await req.json()

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'Client ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify client exists
    const { data: clientData, error: clientError } = await supabase
      .from('client_users')
      .select('id, user_id, whatsapp_api_key, whatsapp_number')
      .eq('id', clientId)
      .single()

    if (clientError || !clientData) {
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (action === 'sync') {
      // Get the client_id (from clients table) for this user
      let clientOrgId = clientId;
      try {
        // First try to get the client_id from the client_users table
        const { data: clientUserData, error: clientUserError } = await supabase
          .from('client_users')
          .select('client_id')
          .eq('id', clientId)
          .single();
        
        if (!clientUserError && clientUserData?.client_id) {
          clientOrgId = clientUserData.client_id;
          console.log('Retrieved client_id from database:', clientOrgId);
        } else {
          console.error('Could not find client organization ID');
          throw new Error('Could not find client organization ID');
        }
      } catch (error) {
        console.error('Error fetching client_id:', error);
        throw error;
      }

      // Clear existing media for this client
      await supabase
        .from('media')
        .delete()
        .eq('user_id', clientOrgId)

      // Insert new media data
      if (mediaData && Array.isArray(mediaData)) {
        const mediaToInsert = mediaData.map((item: any) => ({
          user_id: clientOrgId, // Use the organization/client ID
          client_id: clientId, // Use the current client_user ID
          added_by: clientId, // Set added_by to the current client user
          name: item.identifier,
          creation_time: item.creationTime,
          description: item.description,
          media_type: item.mediaType,
          media_id: item.mediaId,
          status: item.status,
          waba_number: item.wabaNumber
        }))

        const { data, error } = await supabase
          .from('media')
          .insert(mediaToInsert)
          .select()

        if (error) {
          console.error('Database insert error:', error)
          throw error
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: data,
            message: 'Media synced successfully' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    } else if (action === 'get') {
      // Get the client_id (from clients table) for this user
      let clientOrgId = clientId;
      try {
        // First try to get the client_id from the client_users table
        const { data: clientUserData, error: clientUserError } = await supabase
          .from('client_users')
          .select('client_id')
          .eq('id', clientId)
          .single();
        
        if (!clientUserError && clientUserData?.client_id) {
          clientOrgId = clientUserData.client_id;
          console.log('Retrieved client_id from database for query:', clientOrgId);
        } else {
          console.error('Could not find client organization ID');
          throw new Error('Could not find client organization ID');
        }
      } catch (error) {
        console.error('Error fetching client_id for query:', error);
        throw error;
      }

      // Get media for this client
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .eq('user_id', clientOrgId) // Query by user_id (organization ID)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: data 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
