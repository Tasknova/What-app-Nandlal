import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Users, MessageSquare, Target, Calendar, Send, Eye, Edit, Trash2, RotateCcw, RefreshCw, Clock, AlertTriangle, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClientAuth } from "@/hooks/useClientAuth";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import CampaignCreationWizard from "@/components/CampaignCreationWizard";

interface Campaign {
  id: string;
  name: string;
  description: string;
  message_content: string;
  message_type: string;
  target_groups: string[];
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  scheduled_for?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  client_id?: string;
  group_id?: string;
  template_id?: string;
  variable_mappings?: { [key: string]: string };
  selected_media_id?: string | null;
  selected_media_type?: string | null;
  group_name?: string;
  template_name?: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  contact_count: number;
}

interface Template {
  id: string;
  template_name: string;
  template_body: string | null;
  template_header: string | null;
  template_footer: string | null;
  category: string;
  created_at: string;
  updated_at: string;
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [sendingCampaigns, setSendingCampaigns] = useState<Set<string>>(new Set());
  const [overdueCampaigns, setOverdueCampaigns] = useState<number>(0);
  const [showWalletBalance, setShowWalletBalance] = useState(false);

  const { toast } = useToast();
  const { client, session: clientSession } = useClientAuth();
  const { balance, loading: walletLoading, error: walletError, fetchWalletBalance, formatBalance, formatExpiryDate } = useWalletBalance();
  const navigate = useNavigate();

  // Function to check if campaign can be retried/resent
  const canRetryCampaign = (campaign: Campaign) => {
    return campaign.status === 'sent' && campaign.failed_count > 0;
  };

  const canResendCampaign = (campaign: Campaign) => {
    return campaign.status === 'sent' && campaign.sent_count > 0;
  };

  // Function to manually process scheduled campaigns
  const processScheduledCampaigns = async () => {
    try {
      toast({
        title: "Processing Scheduled Campaigns...",
        description: "Please wait while we process overdue campaigns",
      });

      // Call the edge function to process scheduled campaigns using Supabase client
      const { data: result, error } = await supabase.functions.invoke('process-scheduled-campaigns', {
        method: 'POST',
      });

      if (error) {
        console.error('Function invocation error:', error);
        throw error;
      }

      if (result.success) {
        toast({
          title: "Success",
          description: result.message || "Scheduled campaigns processed successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to process scheduled campaigns",
          variant: "destructive",
        });
      }

      // Reload campaigns to update the UI
      loadData();

      // Reset overdue campaigns count
      setOverdueCampaigns(0);

    } catch (error: any) {
      console.error('Error processing scheduled campaigns:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process scheduled campaigns",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadData();

    // Check for scheduled campaigns that need to be processed
    const checkScheduledCampaigns = async () => {
      try {
        const currentUTCTime = new Date().toISOString();

        const { data: overdueCampaigns } = await supabase
          .from('campaigns')
          .select('id, name, scheduled_for')
          .eq('status', 'scheduled')
          .lte('scheduled_for', currentUTCTime);

        setOverdueCampaigns(overdueCampaigns?.length || 0);

        if (overdueCampaigns && overdueCampaigns.length > 0) {
          // Process them automatically
          await processScheduledCampaigns();

          // Show success notification
          toast({
            title: "Campaigns Processed",
            description: `Successfully processed ${overdueCampaigns.length} scheduled campaign(s)`,
          });
        }
      } catch (error) {
        console.error('Error checking scheduled campaigns:', error);
      }
    };

    // Check for campaigns with "sending" status that need to be processed
    const checkSendingCampaigns = async () => {
      try {
        const { data: sendingCampaigns } = await supabase
          .from('campaigns')
          .select('id, name')
          .eq('client_id', client?.id)
          .eq('status', 'sending');

        if (sendingCampaigns && sendingCampaigns.length > 0) {
          console.log('Found campaigns with sending status on load:', sendingCampaigns);
          // Process them automatically
          await processSendingCampaigns();
        }
      } catch (error) {
        console.error('Error checking sending campaigns:', error);
      }
    };

    // Check immediately and then every minute for live updates
    checkScheduledCampaigns();
    checkSendingCampaigns();
    const interval = setInterval(() => {
      checkScheduledCampaigns();
      checkSendingCampaigns();
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Build query for campaigns - show all campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('client_id', client?.id)
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      // Load groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .eq('client_id', client?.id);

      if (groupsError) throw groupsError;

      // Get contact counts for each group using the direct relationship
      const groupsWithCount = await Promise.all((groupsData || []).map(async (group) => {
        const { count: contactCount, error: countError } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id)
          .eq('client_id', client?.id);

        if (countError) {
          console.error(`Error counting contacts for group ${group.id}:`, countError);
        }

        return {
          ...group,
          contact_count: contactCount || 0
        };
      }));

      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('templates')
        .select('*')
        .eq('client_id', client?.id);

      if (templatesError) throw templatesError;

      // Combine campaign data with group and template information
      const campaignsWithDetails = (campaignsData || []).map(campaign => {
        const group = groupsData?.find(g => g.id === campaign.group_id);
        const template = templatesData?.find(t => t.id === campaign.template_id);

        return {
          ...campaign,
          group_name: group?.name || 'Unknown Group',
          template_name: template?.template_name || 'No Template'
        };
      });

      setCampaigns(campaignsWithDetails);
      setGroups(groupsWithCount);
      setTemplates(templatesData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: `Failed to load campaigns data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // OLD FORM FUNCTION - REMOVED
  const handleCreateCampaign_OLD = async () => {
    try {
  
      console.log('Form data:', JSON.stringify(formData, null, 2));
      console.log('Client ID:', client?.id);
      console.log('Selected template:', selectedTemplate);
      console.log('Variable mappings:', variableMappings);

      // Add to sending state to show loading
      setSendingCampaigns(prev => new Set(prev).add('creating'));

      if (!formData.name || !formData.group_id || !formData.template_id) {
        console.log('Validation failed - missing required fields');
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields: Campaign Name, Contact List, and Message Template",
          variant: "destructive",
        });
        return;
      }

      // Check if media is required and selected for media templates
      if (selectedTemplate?.template_header && (!selectedMedia || !selectedMedia.id)) {
        console.log('Validation failed - media required for media template');
        toast({
          title: "Validation Error",
          description: "Please select media for this template",
          variant: "destructive",
        });
        return;
      }

      // Check if the selected group has contacts
      const { data: actualContacts, error: contactCountError, count: contactCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', formData.group_id)
        .eq('client_id', client?.id);

      const actualContactCount = contactCount || 0;

      if (contactCountError) {
        console.error('Error getting contact count:', contactCountError);
      }

      if (actualContactCount === 0) {
        toast({
          title: "No Contacts in Group",
          description: "The selected contact list has no contacts. Please add contacts to this group before creating a campaign.",
          variant: "destructive",
        });
        return;
      }

      // Show confirmation for "Send Now" campaigns
      if (formData.campaign_type === 'send_now') {
        const selectedGroup = groups.find(g => g.id === formData.group_id);

        const confirmed = window.confirm(
          `Are you sure you want to immediately send this campaign to ${actualContactCount} contacts?\n\nThis action cannot be undone.`
        );

        if (!confirmed) {
          return;
        }
      }

      // Check if all variables are mapped
      if (selectedTemplate) {
        const variables = extractVariables(getTemplateContent(selectedTemplate));
        const unmappedVariables = variables.filter(variable => !variableMappings[variable]);

        if (unmappedVariables.length > 0) {
          toast({
            title: "Validation Error",
            description: `Please map all template variables: ${unmappedVariables.map(v => `{{${v}}}`).join(', ')}`,
            variant: "destructive",
          });
          return;
        }
      }

      // Validate scheduled date for scheduled campaigns
      if (formData.campaign_type === 'scheduled' && !formData.scheduled_for) {
        toast({
          title: "Validation Error",
          description: "Please select a date and time for scheduled campaigns",
          variant: "destructive",
        });
        return;
      }

      if (!client?.id) {
        console.log('Authentication failed - no client ID');
        toast({
          title: "Authentication Error",
          description: "Please log in again",
          variant: "destructive",
        });
        return;
      }

      // Validate that the group exists and belongs to the client
      console.log('Validating group access...');
      const { data: groupValidation, error: groupError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('id', formData.group_id)
        .eq('client_id', client.id)
        .single();

      if (groupError || !groupValidation) {
        console.log('Group validation failed:', groupError);
        toast({
          title: "Group Access Error",
          description: "The selected contact list does not exist or you don't have access to it.",
          variant: "destructive",
        });
        return;
      }

      // Validate that the template exists and belongs to the client
      console.log('Validating template access...');
      const { data: templateValidation, error: templateError } = await supabase
        .from('templates')
        .select('id, template_name')
        .eq('id', formData.template_id)
        .eq('client_id', client.id)
        .single();

      if (templateError || !templateValidation) {
        console.log('Template validation failed:', templateError);
        toast({
          title: "Template Access Error",
          description: "The selected message template does not exist or you don't have access to it.",
          variant: "destructive",
        });
        return;
      }

      console.log('All validations passed');

      // Determine campaign status based on campaign type
      let campaignStatus: 'draft' | 'scheduled' | 'sending' | 'sent';

      if (formData.campaign_type === 'send_now') {
        campaignStatus = 'sending';
      } else if (formData.campaign_type === 'scheduled') {
        campaignStatus = 'scheduled';
      } else {
        campaignStatus = 'draft';
      }

      // Get the client_id (from clients table) for this user
      let clientOrgId = client?.id;
      try {
        // First try to get the client_id from the client_users table
        const { data: clientData, error: clientError } = await supabase
          .from('client_users')
          .select('client_id')
          .eq('id', client?.id)
          .single();
        
        if (!clientError && clientData?.client_id) {
          clientOrgId = clientData.client_id;
          console.log('Retrieved client_id from database for campaign:', clientOrgId);
        } else {
          console.error('Could not find client organization ID');
          throw new Error('Could not find client organization ID');
        }
      } catch (error) {
        console.error('Error fetching client_id for campaign:', error);
        throw error;
      }

      const campaignData = {
        name: formData.name,
        description: formData.description,
        message_content: selectedTemplate ? getTemplateContent(selectedTemplate) : '',
        message_type: 'text',
        target_groups: [formData.group_id], // This will be converted to UUID array by Supabase
        user_id: clientOrgId, // Use the organization/client ID
        client_id: client?.id, // Use the current client_user ID
        added_by: client?.id, // Set added_by to the current client user
        group_id: formData.group_id,
        template_id: formData.template_id,
        status: campaignStatus,
        scheduled_for: formData.scheduled_for ? formData.scheduled_for.toISOString() : null,
        variable_mappings: variableMappings,
        selected_media_id: selectedMedia?.media_id || null,
        selected_media_type: selectedMedia?.media_type || null
      };

      console.log('Campaign data to insert:', JSON.stringify(campaignData, null, 2));
      console.log('Campaign status:', campaignStatus);

      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (error) {
        console.log('=== SUPABASE ERROR DETAILS ===');
        console.log('Error object:', error);
        console.log('Error code:', error.code);
        console.log('Error message:', error.message);
        console.log('Error details:', error.details);
        console.log('Error hint:', error.hint);

        // Handle unique constraint violation
        if (error.code === '23505' && error.message.includes('campaigns_name_unique')) {
          console.log('Duplicate campaign name error detected');
          toast({
            title: "Duplicate Campaign Name",
            description: "A campaign with this name already exists. Please choose a different name.",
            variant: "destructive",
          });
          return;
        }

        // Handle other common database errors
        if (error.code === '23503') {
          console.log('Foreign key constraint violation');
          toast({
            title: "Reference Error",
            description: "One or more referenced items (group, template, etc.) do not exist or you don't have access to them.",
            variant: "destructive",
          });
          return;
        }

        if (error.code === '42501') {
          console.log('Permission denied error');
          toast({
            title: "Permission Denied",
            description: "You don't have permission to create campaigns. Please check your account status.",
            variant: "destructive",
          });
          return;
        }

        throw error;
      }

      console.log('Campaign created successfully:', data);
      console.log('Campaign type:', formData.campaign_type);
      console.log('Should send now?', formData.campaign_type === 'send_now');

      // If campaign type is "send_now", immediately send the campaign
      if (formData.campaign_type === 'send_now') {
        console.log('Starting to send campaign immediately...');
        toast({
          title: "Campaign Created",
          description: "Campaign created and sending started...",
        });

        // Start sending the campaign immediately
        try {
          await sendCampaign(data.id);
        } catch (error) {
          console.error('Error in sendCampaign:', error);
          toast({
            title: "Error",
            description: "Campaign created but failed to send messages. You can retry from the campaign list.",
            variant: "destructive",
          });
        }
      } else {
        console.log('Campaign type is not send_now, showing success message');
        toast({
          title: "Success",
          description: formData.campaign_type === 'scheduled'
            ? "Campaign scheduled successfully"
            : "Campaign created successfully",
        });
      }

      setFormData({ name: '', description: '', group_id: '', template_id: '', scheduled_for: null, campaign_type: 'draft' });
      setVariableMappings({});
      setSelectedMedia(null);
      setAvailableMedia([]);
      setShowCreateForm(false);
      setSelectedTemplate(null);
      setSelectedGroup(null);
      loadData();
      
    } catch (error: any) {
      console.error('=== CATCH BLOCK ERROR ===');
      console.error('Error creating campaign:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'No message',
        stack: error instanceof Error ? error.stack : 'No stack',
        error: error
      });

      // Enhanced error message for user
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast({
        title: "Error",
        description: `Failed to create campaign: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      // Remove from sending state
      setSendingCampaigns(prev => {
        const newSet = new Set(prev);
        newSet.delete('creating');
        return newSet;
      });
    }
  };



  const getStatusBadge = (status: string, failedCount: number = 0) => {
    // Determine if campaign should be marked as failed
    const isFailed = status === 'sent' && failedCount > 0;
    const displayStatus = isFailed ? 'failed' : status;
    
    const variants = {
      draft: "secondary",
      scheduled: "default", 
      sending: "default",
      sent: "default",
      failed: "destructive"
    } as const;

    const colors = {
      draft: "bg-gray-100 text-gray-800 border-gray-200",
      scheduled: "bg-blue-100 text-blue-800 border-blue-200",
      sending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      sent: "bg-green-100 text-green-800 border-green-200",
      failed: "bg-red-100 text-red-800 border-red-200"
    };

    const labels = {
      draft: "Draft",
      scheduled: "Scheduled",
      sending: "Sending...",
      sent: "Sent",
      failed: "Failed"
    };

    return (
      <Badge 
        variant={variants[displayStatus as keyof typeof variants] || "secondary"}
        className={colors[displayStatus as keyof typeof colors]}
      >
        {labels[displayStatus as keyof typeof labels]}
      </Badge>
    );
  };

  // Helper functions for template processing
  const getTemplateContent = (template: Template): string => {
    const parts = [];
    if (template.template_header) parts.push(template.template_header);
    if (template.template_body) parts.push(template.template_body);
    if (template.template_footer) parts.push(template.template_footer);
    return parts.join('\n\n');
  };

  const extractVariables = (content: string): string[] => {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      if (!variables.includes(match[1].trim())) {
        variables.push(match[1].trim());
      }
    }

    return variables;
  };


  const sendCampaign = async (campaignId: string) => {
    try {
  
      console.log('Campaign ID:', campaignId);
      console.log('sendCampaign function called at:', new Date().toISOString());

      // Add campaign to sending state
      setSendingCampaigns(prev => new Set(prev).add(campaignId));

      // Show sending notification
      toast({
        title: "Sending Campaign...",
        description: "Please wait while we send your messages",
      });

      // Get client session from localStorage
      const storedSession = localStorage.getItem('client_session');
      const clientSession = storedSession ? JSON.parse(storedSession) : null;
      const clientToken = clientSession?.token;

      // Check if client token is available
      if (!clientToken) {
        toast({
          title: "Authentication Error",
          description: "Please log in again to send campaigns",
          variant: "destructive",
        });
        return;
      }

      console.log('=== LOADING CAMPAIGN ===');
      console.log('Campaign ID to find:', campaignId);
      console.log('Campaigns in local state:', campaigns.length);

      // Get campaign details from local state first
      let campaign = campaigns.find(c => c.id === campaignId);
      console.log('Campaign found in local state:', !!campaign);

      // If not found in local state, try to fetch from database
      if (!campaign) {
        console.log('Campaign not found in local state, fetching from database...');
        const { data: dbCampaign, error: dbError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (dbError || !dbCampaign) {
          console.error('Database campaign error:', dbError);
          toast({
            title: "Error",
            description: "Campaign not found in database",
            variant: "destructive",
          });
          return;
        }

        campaign = dbCampaign;
        console.log('Campaign loaded from database:', campaign);
      } else {
        console.log('Campaign found in local state:', campaign);
      }

      console.log('=== LOADING CONTACT GROUPS ===');
      console.log('Group ID:', campaign.group_id);

      // Get contacts directly from the target group
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('group_id', campaign.group_id)
        .eq('client_id', client?.id);

      if (contactsError) {
        console.error('Contacts error:', contactsError);
        toast({
          title: "Error",
          description: "Failed to load contacts",
          variant: "destructive",
        });
        return;
      }

      console.log('Contacts loaded successfully:', contacts?.length || 0);
      console.log('Contact details:', contacts?.map(c => ({ id: c.id, phone: c.phone, name: c.name })) || []);

      if (!contacts || contacts.length === 0) {
        toast({
          title: "No Contacts",
          description: "No contacts found in the selected group",
          variant: "destructive",
        });
        return;
      }


      if (contactsError) {
        console.error('Contacts error:', contactsError);
        toast({
          title: "Error",
          description: "Failed to load contacts",
          variant: "destructive",
        });
        return;
      }

      console.log('Contacts loaded successfully:', contacts?.length || 0);
      console.log('Contact details:', contacts?.map(c => ({ id: c.id, phone: c.phone, name: c.name })) || []);

      if (!contacts || contacts.length === 0) {
        toast({
          title: "No Contacts",
          description: "No contacts found in the selected group",
          variant: "destructive",
        });
        return;
      }

      console.log('=== LOADING TEMPLATE ===');
      console.log('Template ID:', campaign.template_id);

      // Get template details
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', campaign.template_id)
        .single();

      if (templateError) {
        console.error('Template error:', templateError);
        toast({
          title: "Error",
          description: "Failed to load template",
          variant: "destructive",
        });
        return;
      }

      console.log('Template loaded successfully:', template);

      // Update campaign status to 'sending'
      await supabase
        .from('campaigns')
        .update({ status: 'sending' })
        .eq('id', campaignId);

      let successCount = 0;
      let failureCount = 0;

      console.log('=== STARTING TO SEND MESSAGES ===');
      console.log('Total contacts to send to:', contacts.length);
      console.log('Contacts:', contacts.map(c => ({ id: c.id, phone: c.phone, name: c.name })));

      // Send messages to each contact
      for (const contact of contacts) {
        try {
          // Replace variables in message content
          let messageContent = getTemplateContent(template);
          if (campaign.variable_mappings) {
            Object.keys(campaign.variable_mappings).forEach(variable => {
              const fieldName = campaign.variable_mappings![variable];
              const fieldValue = (contact as any)[fieldName] || '';
              messageContent = messageContent.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), fieldValue);
            });
          }

          // Call the edge function to send the message
          console.log('=== SENDING MESSAGE TO EDGE FUNCTION ===');
          console.log('Contact phone:', contact.phone);
          console.log('Message content:', messageContent);
          console.log('Template name:', template.template_name);
          console.log('Campaign ID:', campaignId);
          console.log('Client token available:', !!clientToken);
          console.log('Client token preview:', clientToken ? clientToken.substring(0, 20) + '...' : 'NO_TOKEN');

          const requestBody = {
            recipient_phone: contact.phone,
            message_content: messageContent,
            message_type: 'text',
            template_name: template.template_name,
            campaign_id: campaignId,
            ...(campaign.selected_media_id && campaign.selected_media_type && {
              media_id: campaign.selected_media_id,
              media_type: campaign.selected_media_type
            })
          };

          console.log('=== EDGE FUNCTION REQUEST DETAILS ===');
          console.log('URL:', `${supabase.supabaseUrl}/functions/v1/send-whatsapp-message`);
          console.log('Method:', 'POST');
          console.log('Headers:', {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${clientToken ? clientToken.substring(0, 20) + '...' : 'NO_TOKEN'}`
          });
          console.log('Request Body:', JSON.stringify(requestBody, null, 2));
          console.log('=== END REQUEST DETAILS ===');

          const response = await fetch(`${supabase.supabaseUrl}/functions/v1/send-whatsapp-message`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${clientToken}`,
            },
            body: JSON.stringify(requestBody)
          });

          console.log('=== EDGE FUNCTION RESPONSE DETAILS ===');
          console.log('Response status:', response.status);
          console.log('Response ok:', response.ok);
          console.log('Response status text:', response.statusText);
          console.log('Response headers:', Object.fromEntries(response.headers.entries()));

          const responseText = await response.text();
          console.log('Raw response body:', responseText);

          let result;
          try {
            result = JSON.parse(responseText);
            console.log('Parsed JSON result:', result);
          } catch (parseError) {
            console.log('Failed to parse JSON response:', parseError);
            result = { success: false, error: 'Invalid JSON response', raw: responseText };
          }
          console.log('=== END RESPONSE DETAILS ===');

          if (result.success) {
            successCount++;
            console.log('Message sent successfully to:', contact.phone);
          } else {
            failureCount++;
            console.log('Message failed for:', contact.phone, 'Error:', result.error || 'Unknown error');
          }

          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          failureCount++;
          console.error('Error sending message to', contact.phone, error);
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
        .eq('id', campaignId);

      // Remove campaign from sending state
      setSendingCampaigns(prev => {
        const newSet = new Set(prev);
        newSet.delete(campaignId);
        return newSet;
      });

      // Show final result
      const totalContacts = contacts.length;
      toast({
        title: "Campaign Sent",
        description: `Successfully sent ${successCount} messages to ${totalContacts} contacts${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
        variant: failureCount > 0 ? "destructive" : "default",
      });

      // Show a toast message about the wait period
      toast({
        title: "Campaign Sent Successfully!",
        description: "Reports will be automatically fetched in 25 seconds. Please wait before viewing campaign details.",
        duration: 3000,
      });

            // Trigger automatic report fetching after 20-30 seconds
      setTimeout(async () => {
        try {
          console.log('Triggering automatic report fetch for campaign:', campaignId);
          
          // Get the updated campaign with sent_count and updated_at timestamp
          const { data: updatedCampaign, error: campaignError } = await supabase
            .from('campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();

          if (campaignError || !updatedCampaign) {
            console.error('Error fetching updated campaign:', campaignError);
            return;
          }

          // Simple approach: Get messages from the last 1 hour and take the latest ones
          const now = new Date();
          const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
          
          // Use UTC components to avoid timezone issues
          const fromDate = `${oneHourAgo.getUTCFullYear()}-${String(oneHourAgo.getUTCMonth() + 1).padStart(2, '0')}-${String(oneHourAgo.getUTCDate()).padStart(2, '0')} ${String(oneHourAgo.getUTCHours()).padStart(2, '0')}:${String(oneHourAgo.getUTCMinutes()).padStart(2, '0')}:${String(oneHourAgo.getUTCSeconds()).padStart(2, '0')}`;
          const toDate = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`;

          console.log('Fetch time range:', fromDate, 'to', toDate);

          const requestBody = {
            userId: client?.user_id,
            fromDate: fromDate,
            toDate: toDate,
            mobileNo: '',
            pageLimit: 200, // Get more records to ensure we capture all messages
            startCursor: '1'
          };

          console.log('Automatic report fetch request:', requestBody);

          const response = await fetch('/api/fetch-reports', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          const responseText = await response.text();
          console.log('Automatic report fetch response:', responseText);
          
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('JSON Parse Error in automatic fetch:', parseError);
            return;
          }

          if (response.ok && data.success && data.data.records) {
            // Simple approach: Sort by submitTime (latest first) and take the first N messages
            const campaignMessages = data.data.records
              .sort((a: any, b: any) => parseInt(b.submitTime) - parseInt(a.submitTime))
              .slice(0, updatedCampaign.sent_count || totalContacts);

            console.log(`Got ${campaignMessages.length} latest messages for campaign ${campaignId} from ${data.data.records.length} total messages`);
            console.log('Message timestamps:', campaignMessages.map((msg: any) => {
              const msgTime = parseInt(msg.submitTime);
              return `${new Date(msgTime).toISOString()} (${msgTime})`;
            }));

            // Update the campaign with the reports data
            const { error: updateError } = await supabase
              .from('campaigns')
              .update({ 
                reports_data: campaignMessages,
                updated_at: new Date().toISOString()
              })
              .eq('id', campaignId);

            if (updateError) {
              console.error('Error updating campaign with reports data:', updateError);
            } else {
              console.log('Campaign reports data updated successfully');
              toast({
                title: "Reports Updated",
                description: `Campaign reports have been automatically fetched and updated`,
              });
            }
          } else {
            console.error('Failed to fetch reports automatically:', data.error || 'Unknown error');
          }
        } catch (error) {
          console.error('Error in automatic report fetching:', error);
        }
      }, 25000); // 25 seconds delay

      // Reload campaigns to update the UI
      loadData();

    } catch (error: any) {
      console.error('=== SEND CAMPAIGN ERROR ===');
      console.error('Error sending campaign:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'No message',
        stack: error instanceof Error ? error.stack : 'No stack',
        error: error
      });

      // Remove campaign from sending state
      setSendingCampaigns(prev => {
        const newSet = new Set(prev);
        newSet.delete(campaignId);
        return newSet;
      });

      // Enhanced error message for user
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast({
        title: "Error",
        description: `Failed to send campaign: ${errorMessage}`,
        variant: "destructive",
      });
      
    }
  };

  // Function to retry failed messages only
  const retryFailedMessages = async (campaignId: string) => {
    try {
      // Add campaign to sending state
      setSendingCampaigns(prev => new Set(prev).add(campaignId));

      // Show retry notification
      toast({
        title: "Retrying Failed Messages...",
        description: "Please wait while we retry sending failed messages",
      });

      // Get client session from localStorage
      const storedSession = localStorage.getItem('client_session');
      const clientSession = storedSession ? JSON.parse(storedSession) : null;
      const clientToken = clientSession?.token;

      // Check if client token is available
      if (!clientToken) {
        toast({
          title: "Authentication Error",
          description: "Please log in again to retry campaigns",
          variant: "destructive",
        });
        return;
      }

      // Get campaign details
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) {
        toast({
          title: "Error",
          description: "Campaign not found",
          variant: "destructive",
        });
        return;
      }

      // Get failed messages for this campaign
      const { data: failedMessages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', 'failed');

      if (messagesError) {
        toast({
          title: "Error",
          description: "Failed to load failed messages",
          variant: "destructive",
        });
        return;
      }

      if (!failedMessages || failedMessages.length === 0) {
        toast({
          title: "No Failed Messages",
          description: "No failed messages found to retry",
          variant: "destructive",
        });
        return;
      }

      // Get template details
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', campaign.template_id)
        .single();

      if (templateError) {
        toast({
          title: "Error",
          description: "Failed to load template",
          variant: "destructive",
        });
        return;
      }

      // Update campaign status to 'sending'
      await supabase
        .from('campaigns')
        .update({ status: 'sending' })
        .eq('id', campaignId);

      let successCount = 0;
      let failureCount = 0;

      // Retry each failed message
      for (const message of failedMessages) {
        try {
          // Get contact details
          const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', message.contact_id)
            .single();

          if (contactError || !contact) {
            failureCount++;
            continue;
          }

          // Replace variables in message content
          let messageContent = getTemplateContent(template);
          if (campaign.variable_mappings) {
            Object.keys(campaign.variable_mappings).forEach(variable => {
              const fieldName = campaign.variable_mappings![variable];
              const fieldValue = (contact as any)[fieldName] || '';
              messageContent = messageContent.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), fieldValue);
            });
          }

          // Call the edge function to send the message
          const response = await fetch(`${supabase.supabaseUrl}/functions/v1/send-whatsapp-message`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${clientToken}`,
            },
            body: JSON.stringify({
              recipient_phone: contact.phone,
              message_content: messageContent,
              message_type: 'text',
              template_name: template.template_name,
              campaign_id: campaignId
            })
          });

          const result = await response.json();

          if (result.success) {
            successCount++;

            // Update message status to sent
            await supabase
              .from('messages')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', message.id);
          } else {
            failureCount++;

            // Update message with new error
            await supabase
              .from('messages')
              .update({
                error_message: result.error || 'Retry failed',
                updated_at: new Date().toISOString()
              })
              .eq('id', message.id);
          }

          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          failureCount++;
          console.error('Error retrying message to', (message as any)?.contact?.phone, error);
        }
      }

      // Update campaign with final status and counts
      const currentCampaign = campaigns.find(c => c.id === campaignId);
      const newSentCount = (currentCampaign?.sent_count || 0) + successCount;
      const newFailedCount = Math.max(0, (currentCampaign?.failed_count || 0) - successCount);

      await supabase
        .from('campaigns')
        .update({
          status: 'sent',
          sent_count: newSentCount,
          failed_count: newFailedCount
        })
        .eq('id', campaignId);

      toast({
        title: "Retry Complete!",
        description: `Successfully retried ${successCount} messages. ${failureCount} still failed.`,
      });

      // Reload campaigns to show updated status
      loadData();

    } catch (error: any) {
      console.error('Campaign retry error:', error);
      toast({
        title: "Error",
        description: "Failed to retry campaign",
        variant: "destructive",
      });

      // Reset campaign status to sent on error
      await supabase
        .from('campaigns')
        .update({ status: 'sent' })
        .eq('id', campaignId);
    } finally {
      // Remove campaign from sending state
      setSendingCampaigns(prev => {
        const newSet = new Set(prev);
        newSet.delete(campaignId);
        return newSet;
      });
    }
  };

  // Function to resend entire campaign
  const resendCampaign = async (campaignId: string) => {
    try {
      // Add campaign to sending state
      setSendingCampaigns(prev => new Set(prev).add(campaignId));

      // Show resend notification
      toast({
        title: "Resending Campaign...",
        description: "Please wait while we resend the entire campaign",
      });

      // Get client session from localStorage
      const storedSession = localStorage.getItem('client_session');
      const clientSession = storedSession ? JSON.parse(storedSession) : null;
      const clientToken = clientSession?.token;

      // Check if client token is available
      if (!clientToken) {
        toast({
          title: "Authentication Error",
          description: "Please log in again to resend campaigns",
          variant: "destructive",
        });
        return;
      }

      // Get campaign details
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) {
        toast({
          title: "Error",
          description: "Campaign not found",
          variant: "destructive",
        });
        return;
      }

      // Get all contacts directly from the target group
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('group_id', campaign.group_id)
        .eq('client_id', client?.id);

      if (contactsError) {
        toast({
          title: "Error",
          description: "Failed to load contacts",
          variant: "destructive",
        });
        return;
      }

      if (!contacts || contacts.length === 0) {
        toast({
          title: "No Contacts",
          description: "No contacts found in the selected group",
          variant: "destructive",
        });
        return;
      }

      // Get template details
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', campaign.template_id)
        .single();

      if (templateError) {
        toast({
          title: "Error",
          description: "Failed to load template",
          variant: "destructive",
        });
        return;
      }

      // Update campaign status to 'sending'
      await supabase
        .from('campaigns')
        .update({ status: 'sending' })
        .eq('id', campaignId);

      let successCount = 0;
      let failureCount = 0;

      // Send messages to each contact
      for (const contact of contacts) {
        try {
          // Replace variables in message content
          let messageContent = getTemplateContent(template);
          if (campaign.variable_mappings) {
            Object.keys(campaign.variable_mappings).forEach(variable => {
              const fieldName = campaign.variable_mappings![variable];
              const fieldValue = (contact as any)[fieldName] || '';
              messageContent = messageContent.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), fieldValue);
            });
          }

          // Call the edge function to send the message
          const response = await fetch(`${supabase.supabaseUrl}/functions/v1/send-whatsapp-message`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${clientToken}`,
            },
            body: JSON.stringify({
              recipient_phone: contact.phone,
              message_content: messageContent,
              message_type: 'text',
              template_name: template.template_name,
              campaign_id: campaignId
            })
          });

          const result = await response.json();

          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }

          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          failureCount++;
          console.error('Error resending message to', (contact as any)?.phone, error);
        }
      }

      // Update campaign with final status and counts
      await supabase
        .from('campaigns')
        .update({
          status: 'sent',
          sent_count: successCount,
          failed_count: failureCount
        })
        .eq('id', campaignId);

      toast({
        title: "Campaign Resent!",
        description: `Successfully resent ${successCount} messages. ${failureCount} failed.`,
      });

      // Reload campaigns to show updated status
      loadData();

    } catch (error: any) {
      console.error('Campaign resend error:', error);
      toast({
        title: "Error",
        description: "Failed to resend campaign",
        variant: "destructive",
      });

      // Reset campaign status to sent on error
      await supabase
        .from('campaigns')
        .update({ status: 'sent' })
        .eq('id', campaignId);
    } finally {
      // Remove campaign from sending state
      setSendingCampaigns(prev => {
        const newSet = new Set(prev);
        newSet.delete(campaignId);
        return newSet;
      });
    }
  };

  const processSendingCampaigns = async () => {
    try {


      // Find campaigns with "sending" status
      const { data: sendingCampaigns, error } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .eq('client_id', client?.id)
        .eq('status', 'sending');

      if (error) {
        console.error('Error fetching sending campaigns:', error);
        return;
      }

      console.log('Found sending campaigns:', sendingCampaigns);

      if (sendingCampaigns && sendingCampaigns.length > 0) {
        toast({
          title: "Processing Sending Campaigns",
          description: `Found ${sendingCampaigns.length} campaign(s) with 'sending' status`,
        });

        for (const campaign of sendingCampaigns) {
          console.log('Processing sending campaign:', campaign.id);
          await sendCampaign(campaign.id);
        }
      } else {
        console.log('No campaigns with sending status found');
        toast({
          title: "No Sending Campaigns",
          description: "No campaigns found with 'sending' status",
        });
      }
    } catch (error) {
      console.error('Error processing sending campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to process sending campaigns",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete the campaign "${campaign.name}"?\n\n` +
      `This will also delete all associated messages and cannot be undone.`
    );

    if (!confirmed) return;

    try {
      // Delete the campaign (messages will be automatically deleted due to CASCADE)
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });

      // Reload campaigns
      loadData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Campaigns</h1>
            <p className="text-muted-foreground">Create and manage your WhatsApp campaigns</p>
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gray-100 rounded-full">
            <Target className="h-6 w-6 text-gray-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Campaigns</h2>
        </div>
        <p className="text-gray-600 text-lg">
          Create and manage your WhatsApp campaigns
        </p>
        <div className="flex gap-2 mt-6">
          <Button onClick={() => setShowCreateWizard(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>
          {/* Wallet Balance Icon */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await fetchWalletBalance();
                setShowWalletBalance(true);
                setTimeout(() => setShowWalletBalance(false), 3000); // Hide after 3 seconds
              }}
              disabled={walletLoading}
              className="relative"
              title="Click to view wallet balance"
            >
              <Wallet className="h-4 w-4" />
              {walletLoading && (
                <div className="absolute -top-1 -right-1">
                  <RefreshCw className="h-3 w-3 animate-spin text-gray-600" />
                </div>
              )}
              {balance && !walletLoading && (
                <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  ₹
                </div>
              )}
            </Button>
            
            {/* Wallet Balance Tooltip */}
            {showWalletBalance && balance && (
              <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-sm">Wallet Balance</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">SMS Balance:</span>
                    <span className="font-medium">₹{formatBalance(balance.smsBalance)}</span>
                  </div>
                  {balance.expiryDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Expires:</span>
                      <span className="font-medium">{formatExpiryDate(balance.expiryDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Campaign Wizard */}
      {showCreateWizard && (
        <CampaignCreationWizard
          onCampaignCreated={loadData}
          onClose={() => setShowCreateWizard(false)}
        />
      )}

      {/* Legacy Create Campaign Form - REMOVED */}
      {false && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Create New Campaign
            </CardTitle>
            <CardDescription>
              Set up your WhatsApp campaign with target audience and message template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Campaign Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter campaign name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of the campaign"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>

            {/* Contact List Selection */}
            <div className="space-y-2">
              <Label>Select Contact List *</Label>
              <Select value={formData.group_id} onValueChange={handleGroupChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a contact list" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{group.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {group.contact_count} contacts
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedGroup && (
                <div className="text-sm text-muted-foreground">
                  Selected: {selectedGroup.name} ({selectedGroup.contact_count} contacts)
                </div>
              )}
              {selectedGroup && selectedGroup.contact_count === 0 && (
                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">No contacts in this group</span>
                  </div>
                  <p className="mt-1">
                    This group has no contacts. Please add contacts to this group before creating a campaign, 
                    or select a different group that contains contacts.
                  </p>
                  <div className="mt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/contacts')}
                      className="text-amber-700 border-amber-300 hover:bg-amber-100"
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Go to Contact Management
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <Label>Select Message Template *</Label>
              <Select value={formData.template_id} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a message template">
                    {selectedTemplate ? selectedTemplate.template_name : "Choose a message template"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{template.template_name}</span>
                        <Badge variant="outline" className="ml-2">
                          {template.category}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <div className="text-sm text-muted-foreground">
                  Selected: {selectedTemplate.template_name} ({selectedTemplate.category})
                </div>
              )}
            </div>

            {/* Media Selection for Media Templates */}
            {selectedTemplate?.template_header && availableMedia.length > 0 && (
              <div className="space-y-2">
                <Label>Select Media *</Label>
                <Select 
                  value={selectedMedia?.id || ''} 
                  onValueChange={(mediaId) => {
                    const media = availableMedia.find(m => m.id === mediaId);
                    setSelectedMedia(media || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose media for this template">
                      {selectedMedia ? selectedMedia.name : "Choose media for this template"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableMedia.map((media) => (
                      <SelectItem key={media.id} value={media.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{media.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {media.media_type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedMedia && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {selectedMedia.name} ({selectedMedia.media_type})
                  </div>
                )}
              </div>
            )}

            {/* Variable Mapping */}
            {selectedTemplate && extractVariables(getTemplateContent(selectedTemplate)).length > 0 && (
              <div className="space-y-4">
                <Label>Map Template Variables to Contact Fields</Label>
                <div className="space-y-3">
                  {extractVariables(getTemplateContent(selectedTemplate)).map((variable) => (
                    <div key={variable} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">
                          Variable: <code className="bg-muted px-1 rounded text-xs">{`{{${variable}}}`}</code>
                        </Label>
                      </div>
                      <Select
                        value={variableMappings[variable] || ''}
                        onValueChange={(value) => setVariableMappings(prev => ({ ...prev, [variable]: value }))}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select contact field" />
                        </SelectTrigger>
                        <SelectContent>
                          {contactFieldOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {variableMappings[variable] && (
                        <Badge variant="success" className="text-xs">
                          ✓ Mapped
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  These variables will be replaced with actual contact data when the campaign is sent.
                </p>
              </div>
            )}

            {/* Message Preview */}
            {selectedTemplate && (
              <div className="space-y-2">
                <Label>Message Preview</Label>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">WA</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-green-800">WhatsApp Business</div>
                      <div className="text-xs text-green-600">Now</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-sm text-gray-800 whitespace-pre-wrap">
                      {getTemplateContent(selectedTemplate) ? getPreviewContent(getTemplateContent(selectedTemplate)) : 'No template content available'}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Campaign Action Type */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Campaign Action</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Draft Option */}
                <div
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    formData.campaign_type === 'draft'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                    }`}
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    campaign_type: 'draft',
                    scheduled_for: null
                  }))}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="radio"
                      checked={formData.campaign_type === 'draft'}
                      onChange={() => { }}
                      className="w-4 h-4 text-primary"
                    />
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Edit className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <h4 className="font-medium text-sm mb-1">Save as Draft</h4>
                  <p className="text-xs text-muted-foreground">
                    Create campaign and save for later editing or sending
                  </p>
                </div>

                {/* Schedule Option */}
                <div
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    formData.campaign_type === 'scheduled'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                    }`}
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    campaign_type: 'scheduled',
                    scheduled_for: prev.scheduled_for || new Date()
                  }))}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="radio"
                      checked={formData.campaign_type === 'scheduled'}
                      onChange={() => { }}
                      className="w-4 h-4 text-primary"
                    />
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-orange-600" />
                    </div>
                  </div>
                  <h4 className="font-medium text-sm mb-1">Schedule</h4>
                  <p className="text-xs text-muted-foreground">
                    Schedule campaign to be sent at a specific date and time
                  </p>
                </div>

                {/* Send Now Option */}
                <div
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    formData.campaign_type === 'send_now'
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                    }`}
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    campaign_type: 'send_now',
                    scheduled_for: null
                  }))}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="radio"
                      checked={formData.campaign_type === 'send_now'}
                      onChange={() => { }}
                      className="w-4 h-4 text-primary"
                    />
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Send className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  <h4 className="font-medium text-sm mb-1">Send Now</h4>
                  <p className="text-xs text-muted-foreground">
                    Create and immediately send the campaign to all contacts
                  </p>
                </div>
              </div>

              {/* Schedule Date & Time (only show for scheduled campaigns) */}
              {formData.campaign_type === 'scheduled' && (
                <div className="mt-4 space-y-2">
                  <Label>Schedule Date & Time</Label>
                  <DateTimePicker
                    value={formData.scheduled_for}
                    onChange={(date) => setFormData(prev => ({ ...prev, scheduled_for: date }))}
                    placeholder="Pick a date and time"
                  />
                  <p className="text-sm text-muted-foreground">
                    Campaign will be automatically sent at the scheduled time.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Time shown in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCreateCampaign}
                className={`flex items-center gap-2 ${
                  formData.campaign_type === 'send_now'
                    ? 'bg-green-600 hover:bg-green-700'
                    : formData.campaign_type === 'scheduled'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : ''
                  }`}
                disabled={sendingCampaigns.has('creating')}
              >
                {sendingCampaigns.has('creating') ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                    {formData.campaign_type === 'send_now' ? 'Creating & Sending...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {formData.campaign_type === 'draft' && <Edit className="h-4 w-4" />}
                    {formData.campaign_type === 'scheduled' && <Clock className="h-4 w-4" />}
                    {formData.campaign_type === 'send_now' && <Send className="h-4 w-4" />}
                    {formData.campaign_type === 'draft' && 'Save as Draft'}
                    {formData.campaign_type === 'scheduled' && 'Schedule Campaign'}
                    {formData.campaign_type === 'send_now' && 'Create & Send Now'}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({ name: '', description: '', group_id: '', template_id: '', scheduled_for: null, campaign_type: 'draft' });
                  setSelectedTemplate(null);
                  setSelectedGroup(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaigns List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Your Campaigns</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live updates every minute</span>
            </div>
          </div>
                                                               <div className="flex gap-2">
             <Button
               variant="outline"
               onClick={loadData}
               size="sm"
               className="flex items-center gap-2"
             >
               <RefreshCw className="h-4 w-4" />
               Refresh
             </Button>
           </div>
        </div>
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first campaign to start sending WhatsApp messages to your contacts
              </p>
              <Button onClick={() => setShowCreateWizard(true)}>
                Create Your First Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{campaign.name}</h3>
                        {getStatusBadge(campaign.status, campaign.failed_count)}
                        {campaign.scheduled_for && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Scheduled
                          </Badge>
                        )}
                      </div>
                      {campaign.description && (
                        <p className="text-muted-foreground mb-3">{campaign.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{campaign.group_name || 'Unknown List'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{campaign.template_name || 'Custom Message'}</span>
                        </div>
                        {campaign.variable_mappings && Object.keys(campaign.variable_mappings).length > 0 && (
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {Object.keys(campaign.variable_mappings).length} variables mapped
                            </Badge>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(campaign.created_at).toLocaleDateString()}</span>
                        </div>
                        {campaign.scheduled_for && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Scheduled: {format(new Date(campaign.scheduled_for), "MMM d, HH:mm")} (Local) / {new Date(campaign.scheduled_for).toISOString().slice(11, 16)} (UTC)</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {campaign.status === 'draft' && (
                        <Button
                          onClick={() => sendCampaign(campaign.id)}
                          size="sm"
                          disabled={sendingCampaigns.has(campaign.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {sendingCampaigns.has(campaign.id) ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              Send
                            </>
                          )}
                        </Button>
                      )}
                      {campaign.status === 'scheduled' && (
                        <Button
                          onClick={() => sendCampaign(campaign.id)}
                          size="sm"
                          disabled={sendingCampaigns.has(campaign.id)}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          {sendingCampaigns.has(campaign.id) ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              Send Now
                            </>
                          )}
                        </Button>
                      )}
                      {campaign.status === 'sent' && (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="success" className="text-xs">
                              {campaign.sent_count} sent
                            </Badge>
                            {campaign.failed_count > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {campaign.failed_count} failed
                              </Badge>
                            )}
                          </div>

                          {/* Retry Failed Messages Button */}
                          {canRetryCampaign(campaign) && (
                            <Button
                              onClick={() => retryFailedMessages(campaign.id)}
                              size="sm"
                              disabled={sendingCampaigns.has(campaign.id)}
                              variant="outline"
                              className="border-orange-200 text-orange-700 hover:bg-orange-50"
                            >
                              {sendingCampaigns.has(campaign.id) ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2" />
                                  Retrying...
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="h-4 w-4" />
                                  Retry Failed
                                </>
                              )}
                            </Button>
                          )}


                        </>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/campaign/${campaign.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {campaign.status !== 'sent' && (
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        className="border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}