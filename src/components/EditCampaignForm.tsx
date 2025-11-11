import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Edit, 
  Users, 
  MessageSquare, 
  Clock, 
  Send, 
  AlertTriangle,
  Loader2
} from "lucide-react";

interface EditCampaignFormProps {
  campaignId: string;
  onCampaignUpdated: () => void;
}

interface Campaign {
  id: string;
  name: string;
  description: string;
  message_content: string;
  message_type: string;
  status: string;
  scheduled_for: string | null;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  client_id: string;
  group_id: string;
  template_id: string;
  variable_mappings?: { [key: string]: string };
  selected_media_id?: string | null;
  selected_media_type?: string | null;
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
  template_body: string;
  template_header: string;
  template_footer: string;
  whatsapp_status: string;
  system_status: string;
  media_type: string;
  language: string;
  category: string;
  creation_time: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  client_id: string;
}

interface Media {
  id: string;
  name: string;
  description: string;
  media_type: string;
  media_id: string;
  status: string;
  creation_time: number;
  waba_number: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  client_id: string;
}

export default function EditCampaignForm({ campaignId, onCampaignUpdated }: EditCampaignFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [variableMappings, setVariableMappings] = useState<{ [key: string]: string }>({});
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    group_id: '',
    template_id: '',
    scheduled_for: null as Date | null,
    campaign_type: 'draft' as 'draft' | 'scheduled' | 'send_now'
  });

  const { toast } = useToast();
  const { admin } = useAdminAuth();

  // Contact field options for variable mapping
  const contactFieldOptions = [
    { value: 'name', label: 'Contact Name' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'email', label: 'Email Address' },
    { value: 'custom_fields.company', label: 'Company' },
    { value: 'custom_fields.position', label: 'Position' },
    { value: 'custom_fields.address', label: 'Address' },
  ];

  useEffect(() => {
    if (open && campaignId) {
      fetchData();
    }
  }, [open, campaignId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch campaign details
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Get client ID from campaign
      const clientId = campaignData.user_id;

      // Get client users for this client
      const { data: clientUsers, error: usersError } = await supabase
        .from('client_users')
        .select('id')
        .eq('client_id', clientId);

      if (usersError) throw usersError;

      const userIds = clientUsers?.map(u => u.id) || [];

      // Fetch groups, templates, and media for this client
      const [groupsResult, templatesResult, mediaResult] = await Promise.all([
        supabase
          .from('groups')
          .select('*')
          .in('client_id', userIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('templates')
          .select('*')
          .in('client_id', userIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('media')
          .select('*')
          .in('client_id', userIds)
          .order('created_at', { ascending: false })
      ]);

      if (groupsResult.error) throw groupsResult.error;
      if (templatesResult.error) throw templatesResult.error;
      if (mediaResult.error) throw mediaResult.error;

      // Get contact counts for groups
      const groupsWithCounts = await Promise.all(
        (groupsResult.data || []).map(async (group) => {
          const { count } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);
          
          return {
            ...group,
            contact_count: count || 0
          };
        })
      );

      setGroups(groupsWithCounts);
      setTemplates(templatesResult.data || []);
      setMedia(mediaResult.data || []);

      // Set form data from campaign
      const campaignType = campaignData.status === 'scheduled' ? 'scheduled' : 
                          campaignData.status === 'sending' || campaignData.status === 'sent' ? 'send_now' : 'draft';

      setFormData({
        name: campaignData.name,
        description: campaignData.description || '',
        group_id: campaignData.group_id,
        template_id: campaignData.template_id,
        scheduled_for: campaignData.scheduled_for ? new Date(campaignData.scheduled_for) : null,
        campaign_type: campaignType
      });

      // Set selected items
      const group = groupsWithCounts.find(g => g.id === campaignData.group_id);
      const template = templatesResult.data?.find(t => t.id === campaignData.template_id);
      const mediaItem = mediaResult.data?.find(m => m.media_id === campaignData.selected_media_id);

      setSelectedGroup(group || null);
      setSelectedTemplate(template || null);
      setSelectedMedia(mediaItem || null);
      setVariableMappings(campaignData.variable_mappings || {});

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load campaign data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGroupChange = (groupId: string) => {
    setFormData(prev => ({ ...prev, group_id: groupId }));
    const group = groups.find(g => g.id === groupId);
    setSelectedGroup(group || null);
  };

  const handleTemplateChange = (templateId: string) => {
    setFormData(prev => ({ ...prev, template_id: templateId }));
    const template = templates.find(t => t.id === templateId);
    setSelectedTemplate(template || null);
    setSelectedMedia(null); // Reset media selection when template changes
  };

  const getTemplateContent = (template: Template): string => {
    let content = '';
    if (template.template_header) content += template.template_header + '\n\n';
    if (template.template_body) content += template.template_body;
    if (template.template_footer) content += '\n\n' + template.template_footer;
    return content;
  };

  const extractVariables = (content: string): string[] => {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    while ((match = variableRegex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    return variables;
  };

  const getPreviewContent = (content: string): string => {
    return content.replace(/\{\{(\w+)\}\}/g, 'Sample Data');
  };

  const handleUpdateCampaign = async () => {
    try {
      setLoading(true);

      if (!formData.name || !formData.group_id || !formData.template_id) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields: Campaign Name, Contact List, and Message Template",
          variant: "destructive",
        });
        return;
      }

      // Check if media is required and selected for media templates
      if (selectedTemplate?.template_header && (!selectedMedia || !selectedMedia.id)) {
        toast({
          title: "Validation Error",
          description: "Please select media for this template",
          variant: "destructive",
        });
        return;
      }

      // Check if the selected group has contacts
      const { count: contactCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', formData.group_id);

      if ((contactCount || 0) === 0) {
        toast({
          title: "No Contacts in Group",
          description: "The selected contact list has no contacts. Please add contacts to this group before updating the campaign.",
          variant: "destructive",
        });
        return;
      }

      // Show confirmation for "Send Now" campaigns
      if (formData.campaign_type === 'send_now') {
        const confirmed = window.confirm(
          `Are you sure you want to immediately send this campaign to ${contactCount} contacts?\n\nThis action cannot be undone.`
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

      // Determine campaign status based on campaign type
      let campaignStatus: 'draft' | 'scheduled' | 'sending' | 'sent';

      if (formData.campaign_type === 'send_now') {
        campaignStatus = 'sending';
      } else if (formData.campaign_type === 'scheduled') {
        campaignStatus = 'scheduled';
      } else {
        campaignStatus = 'draft';
      }

      const updateData = {
        name: formData.name,
        description: formData.description,
        message_content: selectedTemplate ? getTemplateContent(selectedTemplate) : '',
        group_id: formData.group_id,
        template_id: formData.template_id,
        status: campaignStatus,
        scheduled_for: formData.scheduled_for ? formData.scheduled_for.toISOString() : null,
        variable_mappings: variableMappings,
        selected_media_id: selectedMedia?.media_id || null,
        selected_media_type: selectedMedia?.media_type || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', campaignId)
        .select()
        .single();

      if (error) {
        console.error('Campaign update error:', error);
        toast({
          title: "Error",
          description: "Failed to update campaign. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Campaign "${formData.name}" updated successfully!`
      });

      setOpen(false);
      onCampaignUpdated();

    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't show edit button if campaign is already sent
  if (campaign && (campaign.status === 'sent' || campaign.status === 'sending')) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Campaign
          </DialogTitle>
          <DialogDescription>
            Update campaign settings and content
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
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
            {selectedTemplate?.template_header && media.length > 0 && (
              <div className="space-y-2">
                <Label>Select Media *</Label>
                <Select 
                  value={selectedMedia?.id || ''} 
                  onValueChange={(mediaId) => {
                    const mediaItem = media.find(m => m.id === mediaId);
                    setSelectedMedia(mediaItem || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose media for this template">
                      {selectedMedia ? selectedMedia.name : "Choose media for this template"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {media.map((mediaItem) => (
                      <SelectItem key={mediaItem.id} value={mediaItem.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{mediaItem.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {mediaItem.media_type}
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
                        <Badge variant="outline" className="text-xs">
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
                    Update campaign and save for later editing or sending
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
                    Update and immediately send the campaign to all contacts
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
                onClick={handleUpdateCampaign}
                className={`flex items-center gap-2 ${
                  formData.campaign_type === 'send_now'
                    ? 'bg-green-600 hover:bg-green-700'
                    : formData.campaign_type === 'scheduled'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : ''
                  }`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {formData.campaign_type === 'send_now' ? 'Updating & Sending...' : 'Updating...'}
                  </>
                ) : (
                  <>
                    {formData.campaign_type === 'draft' && <Edit className="h-4 w-4" />}
                    {formData.campaign_type === 'scheduled' && <Clock className="h-4 w-4" />}
                    {formData.campaign_type === 'send_now' && <Send className="h-4 w-4" />}
                    {formData.campaign_type === 'draft' && 'Update Draft'}
                    {formData.campaign_type === 'scheduled' && 'Update & Schedule'}
                    {formData.campaign_type === 'send_now' && 'Update & Send Now'}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
