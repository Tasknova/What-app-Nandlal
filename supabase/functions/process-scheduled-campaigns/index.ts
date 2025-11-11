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
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current UTC time for comparison
    const currentUTCTime = new Date().toISOString();
    console.log(`Current UTC time: ${currentUTCTime}`);

    // Get all scheduled campaigns that are due to be sent
    const { data: scheduledCampaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select(`
        *,
        groups:group_id(name),
        templates:template_id(name, content)
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_for', currentUTCTime);

    if (campaignsError) {
      console.error('Error fetching scheduled campaigns:', campaignsError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch scheduled campaigns' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    if (!scheduledCampaigns || scheduledCampaigns.length === 0) {
      console.log('No scheduled campaigns found to process');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No scheduled campaigns to process' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log(`Processing ${scheduledCampaigns.length} scheduled campaigns`);
    
    // Log each campaign's scheduled time for debugging
    scheduledCampaigns.forEach(campaign => {
      console.log(`Campaign: ${campaign.name} - Scheduled for: ${campaign.scheduled_for} (UTC)`);
    });

    const results = [];

    for (const campaign of scheduledCampaigns) {
      try {
        console.log(`Processing campaign: ${campaign.name} (${campaign.id})`);

        // Get contacts for this campaign
        const { data: contacts, error: contactsError } = await supabase
          .from('contacts')
          .select('*')
          .eq('group_id', campaign.group_id)
          .eq('user_id', campaign.user_id);

        if (contactsError) {
          console.error(`Error fetching contacts for campaign ${campaign.id}:`, contactsError);
          results.push({ campaignId: campaign.id, success: false, error: 'Failed to fetch contacts' });
          continue;
        }

        if (!contacts || contacts.length === 0) {
          console.log(`No contacts found for campaign ${campaign.id}`);
          results.push({ campaignId: campaign.id, success: false, error: 'No contacts found' });
          continue;
        }

        console.log(`Found ${contacts.length} contacts for campaign ${campaign.id}`);

        // Update campaign status to 'sending'
        await supabase
          .from('campaigns')
          .update({ status: 'sending' })
          .eq('id', campaign.id);

        let successCount = 0;
        let failureCount = 0;

        // Send messages to each contact
        for (const contact of contacts) {
          try {
            // Replace variables in message content
            let messageContent = campaign.templates?.content || campaign.message_content;
            if (campaign.variable_mappings) {
              Object.keys(campaign.variable_mappings).forEach(variable => {
                const fieldName = campaign.variable_mappings[variable];
                const fieldValue = contact[fieldName as keyof typeof contact] || '';
                messageContent = messageContent.replace(new RegExp(variable, 'g'), fieldValue);
              });
            }

            // Create message record
            const { error: messageError } = await supabase
              .from('messages')
              .insert({
                user_id: campaign.user_id,
                recipient_phone: contact.phone,
                message_content: messageContent,
                message_type: campaign.message_type || 'text',
                status: 'pending',
                client_id: campaign.user_id, // Use user_id as client_id since campaigns use user_id
                campaign_id: campaign.id
              });

            if (messageError) {
              console.error(`Error creating message for contact ${contact.id}:`, messageError);
              failureCount++;
            } else {
              successCount++;
            }

            // Add a small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));

          } catch (error) {
            console.error(`Error processing contact ${contact.id}:`, error);
            failureCount++;
          }
        }

        // Update campaign status and counts
        await supabase
          .from('campaigns')
          .update({ 
            status: 'sent',
            sent_count: successCount,
            failed_count: failureCount
          })
          .eq('id', campaign.id);

        results.push({ 
          campaignId: campaign.id, 
          success: true, 
          sent: successCount, 
          failed: failureCount 
        });

        console.log(`Campaign ${campaign.name} processed: ${successCount} sent, ${failureCount} failed`);

      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);
        results.push({ campaignId: campaign.id, success: false, error: error.message });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Processed ${scheduledCampaigns.length} campaigns`,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in process-scheduled-campaigns:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
}); 