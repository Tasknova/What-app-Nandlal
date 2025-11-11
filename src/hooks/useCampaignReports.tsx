import { useState, useCallback, useEffect } from 'react';
import { useClientAuth } from './useClientAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface CampaignReportRecord {
  msgType: string;
  deliveryTime: number;
  billingModel: string;
  channel: string;
  msgId: string;
  cause: string;
  readTime: number;
  mobileNo: number;
  uuId: number;
  wabaNumber: number;
  globalErrorCode: string;
  submitTime: string;
  waConversationId: string;
  id: number;
  campaignName: string;
  status: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent';
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  client_id?: string;
  group_id?: string;
  template_id?: string;
  reports_data?: CampaignReportRecord[];
  group_name?: string;
  template_name?: string;
  contact_count?: number;
}

export const useCampaignReports = () => {
  const { client } = useClientAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch campaigns with their report data
  const loadCampaigns = useCallback(async () => {
    if (!client?.id) return;

    try {
      setLoading(true);
      setError(null);

      console.log('Loading campaigns for client:', client.id);

      // Try client_id first, then user_id as fallback
      let { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          *,
          groups:group_id(name)
        `)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      // If no campaigns found with client_id, try user_id
      if (!campaignsData || campaignsData.length === 0) {
        console.log('No campaigns found with client_id, trying user_id...');
        const { data: campaignsData2, error: campaignsError2 } = await supabase
          .from('campaigns')
          .select(`
            *,
            groups:group_id(name)
          `)
          .eq('user_id', client.id)
          .order('created_at', { ascending: false });
        
        if (campaignsError2) {
          console.error('Error with user_id query:', campaignsError2);
        } else {
          campaignsData = campaignsData2;
          campaignsError = campaignsError2;
        }
      }

      if (campaignsError) throw campaignsError;

      // Get contact counts for each campaign using direct relationship
      const campaignsWithContactCount = await Promise.all((campaignsData || []).map(async (campaign) => {
        const { count: contactCount, error: countError } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', campaign.group_id);

        if (countError) {
          console.error(`Error counting contacts for campaign ${campaign.id}:`, countError);
        }

        return {
          ...campaign,
          group_name: campaign.groups?.name || 'Unknown Group',
          template_name: campaign.template_id ? 'Template Used' : 'No Template',
          contact_count: contactCount || 0
        };
      }));

      console.log('Loaded campaigns with contact counts:', campaignsWithContactCount);
      setCampaigns(campaignsWithContactCount);
    } catch (error: any) {
      console.error('Error loading campaigns:', error);
      setError(error.message);
      toast({
        title: "Error",
        description: "Failed to load campaigns data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [client, toast]);

  // Fetch reports for a specific campaign
  const fetchCampaignReports = useCallback(async (campaign: Campaign) => {
    if (!client) {
      console.error('Client not authenticated');
      return;
    }

    // Check if we have the required credentials
    if (!client.mem_password || !client.whatsapp_number) {
      console.error('Missing required credentials for API call');
      toast({
        title: "Error",
        description: "Missing WhatsApp credentials. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log(`Fetching reports for campaign: ${campaign.name}`);

      // Get the latest N messages where N = contact_count
      const expectedMessageCount = campaign.sent_count > 0 ? campaign.sent_count : (campaign.contact_count || 0);
      
      if (expectedMessageCount === 0) {
        console.log('No messages expected for this campaign');
        return;
      }

      // Format dates for the API (YYYY-MM-DD HH:MM:SS format)
      // Use a more targeted date range around when the campaign was sent
      const campaignCreatedTime = new Date(campaign.created_at);
      const fromDate = new Date(campaignCreatedTime.getTime() - (30 * 60 * 1000)); // 30 minutes before campaign
      const toDate = new Date(campaignCreatedTime.getTime() + (30 * 60 * 1000));   // 30 minutes after campaign
      
      const fromDateStr = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${String(fromDate.getDate()).padStart(2, '0')} ${String(fromDate.getHours()).padStart(2, '0')}:${String(fromDate.getMinutes()).padStart(2, '0')}:${String(fromDate.getSeconds()).padStart(2, '0')}`;
      const toDateStr = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${String(toDate.getDate()).padStart(2, '0')} ${String(toDate.getHours()).padStart(2, '0')}:${String(toDate.getMinutes()).padStart(2, '0')}:${String(toDate.getSeconds()).padStart(2, '0')}`;

      const requestBody = {
        userId: client.user_id || client.id,
        fromDate: fromDateStr,
        toDate: toDateStr,
        mobileNo: '',
        pageLimit: expectedMessageCount,
        startCursor: '1'
      };

      console.log('Campaign Reports API Request Body:', requestBody);
      console.log(`Fetching reports for campaign "${campaign.name}" between ${fromDateStr} and ${toDateStr}`);
      console.log(`Campaign was created at: ${campaign.created_at}`);

      const response = await fetch('/api/fetch-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log('Campaign Reports API Response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        throw new Error('Invalid JSON response from API');
      }

      if (response.ok && data.success && data.data.records) {
        // Get the latest N messages
        const latestMessages = data.data.records
          .sort((a: CampaignReportRecord, b: CampaignReportRecord) => 
            parseInt(b.submitTime) - parseInt(a.submitTime)
          )
          .slice(0, expectedMessageCount);

        console.log(`Got ${latestMessages.length} messages for campaign ${campaign.name}`);

        // Update the campaign with the reports data
        console.log(`Updating campaign ${campaign.id} with reports data...`);
        console.log('Data to update:', { reports_data: latestMessages, updated_at: new Date().toISOString() });
        
        const { data: updateData, error: updateError } = await supabase
          .from('campaigns')
          .update({ 
            reports_data: latestMessages,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaign.id)
          .select('id, name, reports_data, updated_at');

        if (updateError) {
          console.error('Error updating campaign with reports data:', updateError);
          throw updateError;
        }

        console.log(`Successfully updated campaign ${campaign.id} with reports data:`, updateData);

        // Update local state
        setCampaigns(prev => {
          const updated = prev.map(c => 
            c.id === campaign.id 
              ? { ...c, reports_data: latestMessages, updated_at: new Date().toISOString() }
              : c
          );
          console.log('Updated campaigns state:', updated);
          return updated;
        });

        // Force a refresh of the campaigns data to ensure UI is up to date
        setTimeout(() => {
          console.log('Forcing refresh of campaigns data after report update...');
          loadCampaigns();
        }, 1000);

        toast({
          title: "Success",
          description: `Reports fetched for campaign "${campaign.name}"`,
        });

        return latestMessages;
             } else {
         // If no records found, throw an error
         throw new Error(data.error || 'Failed to fetch campaign reports');
       }
    } catch (error: any) {
      console.error('Error fetching campaign reports:', error);
      toast({
        title: "Error",
        description: `Failed to fetch reports for campaign "${campaign.name}": ${error.message}`,
        variant: "destructive",
      });
      throw error;
    }
  }, [client, toast, loadCampaigns]);

  // Monitor campaigns for status changes and automatically fetch reports
  const monitorCampaignStatus = useCallback(async () => {
    if (!client?.id) {
      console.log('No client ID available for monitoring campaigns');
      return;
    }

    try {
      console.log('Monitoring campaign status for client:', client.id);
      
      // Get campaigns that need reports:
      // 1. Campaigns marked as 'sent' but don't have reports_data yet
      // 2. Campaigns marked as 'sending' but have sent_count > 0 (completed sending) and don't have reports_data
      let { data: campaignsNeedingReports, error } = await supabase
        .from('campaigns')
        .select('*')
        .is('reports_data', null)
        .or(`client_id.eq.${client.id},user_id.eq.${client.id}`)
        .or('status.eq.sent,status.eq.sending')
        .not('sent_count', 'eq', 0);

      if (error) {
        console.error('Error fetching campaigns needing reports:', error);
        return;
      }

             // Filter to only include campaigns that actually need reports
       const campaignsToProcess = campaignsNeedingReports?.filter(campaign => {
         // Only include campaigns that have sent messages but no reports
         return campaign.sent_count > 0 && (!campaign.reports_data || campaign.reports_data.length === 0);
       }) || [];

      console.log(`Found ${campaignsToProcess.length} campaigns needing reports:`, campaignsToProcess);

      if (campaignsToProcess.length > 0) {
        console.log(`Processing ${campaignsToProcess.length} campaigns for reports...`);
        
        // Process each campaign
        for (const campaign of campaignsToProcess) {
          try {
            console.log(`Fetching reports for campaign: ${campaign.name} (${campaign.id}) - Status: ${campaign.status}, Sent: ${campaign.sent_count}`);
            
            await fetchCampaignReports(campaign);
            // Add a small delay between API calls to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Failed to fetch reports for campaign ${campaign.id}:`, error);
          }
        }
      } else {
        console.log('No campaigns found that need reports fetching');
      }
    } catch (error) {
      console.error('Error monitoring campaign status:', error);
    }
  }, [client, fetchCampaignReports]);

  // Load campaigns on mount
  useEffect(() => {
    loadCampaigns();
    
    // Test if client can update campaigns table
    if (client?.id) {
      console.log('Testing client permissions for campaigns table...');
      // Try to update a test field to see if there are permission issues
      supabase
        .from('campaigns')
        .select('id, name')
        .eq('client_id', client.id)
        .limit(1)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('Error testing client permissions:', error);
          } else if (data) {
            console.log('Client can read campaigns, testing update permissions...');
            // Try a simple update to test permissions
            supabase
              .from('campaigns')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', data.id)
              .then(({ error: updateError }) => {
                if (updateError) {
                  console.error('Error testing update permissions:', updateError);
                } else {
                  console.log('Client can update campaigns table successfully');
                }
              });
          }
        });
    }
  }, [loadCampaigns, client]);

  // Monitor campaign status every 20 seconds
  useEffect(() => {
    console.log('Setting up campaign monitoring interval (20 seconds)');
    
    // Run immediately on mount
    monitorCampaignStatus();
    
    const interval = setInterval(() => {
      console.log('Campaign monitoring interval triggered');
      monitorCampaignStatus();
    }, 20000);
    return () => clearInterval(interval);
  }, [monitorCampaignStatus]);

  // Debug: Monitor campaigns state changes
  useEffect(() => {
    console.log('Campaigns state changed:', campaigns.length, 'campaigns');
    campaigns.forEach(c => {
      if (c.reports_data) {
        console.log(`Campaign ${c.name} has ${c.reports_data.length} reports`);
      }
    });
  }, [campaigns]);

  // Debug: Monitor campaigns state changes
  useEffect(() => {
    console.log('Campaigns state changed:', campaigns.length, 'campaigns');
    campaigns.forEach(c => {
      if (c.reports_data) {
        console.log(`Campaign ${c.name} has ${c.reports_data.length} reports`);
      }
    });
  }, [campaigns]);

  return {
    campaigns,
    loading,
    error,
    loadCampaigns,
    fetchCampaignReports,
    monitorCampaignStatus
  };
};
