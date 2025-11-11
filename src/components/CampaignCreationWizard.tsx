import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useClientAuth } from "@/hooks/useClientAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Target, 
  Users, 
  MessageSquare, 
  Clock, 
  Send, 
  AlertTriangle,
  Loader2,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  FileText,
  Image,
  Video,
  Music,
  Plus,
  Upload,
  X,
  List,
  UserPlus,
  Info
} from "lucide-react";

interface CampaignCreationWizardProps {
  onCampaignCreated: () => void;
  onClose: () => void;
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
  template_header: string | null;
  template_body: string;
  template_footer: string | null;
  category: string;
  language: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Media {
  id: string;
  name: string;
  description: string;
  media_type: string;
  media_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  client_id: string;
}

type Step = 1 | 2 | 3 | 4;

export default function CampaignCreationWizard({ onCampaignCreated, onClose }: CampaignCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [availableMedia, setAvailableMedia] = useState<Media[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [variableMappings, setVariableMappings] = useState<{ [key: string]: string }>({});
  
  // Enhanced contact selection state
  const [contactSelectionType, setContactSelectionType] = useState<'existing' | 'manual' | 'csv'>('existing');
  const [manualContacts, setManualContacts] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [showCreateListDialog, setShowCreateListDialog] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [creatingListFromCsv, setCreatingListFromCsv] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Duplicate check states
  const [campaignNameError, setCampaignNameError] = useState<string>('');
  const [listNameError, setListNameError] = useState<string>('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    group_id: '',
    template_id: '',
    scheduled_for: null as Date | null,
    campaign_type: 'draft' as 'draft' | 'scheduled' | 'send_now'
  });

  const { toast } = useToast();
  const { client, isLoading: clientLoading } = useClientAuth();

  // Duplicate check functions
  const checkCampaignNameDuplicate = async (name: string) => {
    if (!name.trim() || !client) {
      setCampaignNameError('');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id')
        .eq('name', name.trim())
        .eq('client_id', client.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking campaign name:', error);
        return;
      }

      if (data) {
        setCampaignNameError('A campaign with this name already exists');
      } else {
        setCampaignNameError('');
      }
    } catch (error) {
      console.error('Error checking campaign name:', error);
    }
  };

  const checkListNameDuplicate = async (name: string) => {
    if (!name.trim() || !client) {
      setListNameError('');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id')
        .eq('name', name.trim())
        .eq('client_id', client.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking list name:', error);
        return;
      }

      if (data) {
        setListNameError('A contact list with this name already exists');
      } else {
        setListNameError('');
      }
    } catch (error) {
      console.error('Error checking list name:', error);
    }
  };

  // Contact field options for variable mapping
  const contactFieldOptions = [
    { value: 'name', label: 'Contact Name' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'email', label: 'Email Address' },
    { value: 'custom_fields.company', label: 'Company' },
    { value: 'custom_fields.position', label: 'Position' },
    { value: 'custom_fields.address', label: 'Address' },
  ];

  const steps = [
    { id: 1, title: 'Campaign Details', description: 'Name and description', icon: FileText },
    { id: 2, title: 'Contact List', description: 'Select target audience', icon: Users },
    { id: 3, title: 'Message Template', description: 'Choose template and media', icon: MessageSquare },
    { id: 4, title: 'Campaign Action', description: 'Draft, schedule, or send', icon: Send }
  ];

  useEffect(() => {
    console.log('useEffect triggered - client:', client);
    console.log('useEffect triggered - client?.id:', client?.id);
    console.log('useEffect triggered - clientLoading:', clientLoading);
    
    if (!clientLoading && client?.id) {
      console.log('Client ID found and not loading, fetching data...');
      fetchData();
    } else if (clientLoading) {
      console.log('Client still loading, waiting...');
    } else {
      console.log('No client ID found, skipping data fetch');
    }
  }, [client?.id, clientLoading]);

  // Filter templates when contact selection type changes
  useEffect(() => {
    if (templates.length > 0) {
      let filteredTemplates = templates;
      if (contactSelectionType === 'manual') {
        // For manual entry, only show templates without variable mappings
        filteredTemplates = templates.filter(template => {
          // Check if template has variable mappings (contains {{variable}} patterns)
          const hasMappings = template.template_body?.includes('{{') || 
                             template.template_header?.includes('{{') || 
                             template.template_footer?.includes('{{');
          return !hasMappings;
        });
      }
      setTemplates(filteredTemplates);
    }
  }, [contactSelectionType]);

  const fetchData = async () => {
    try {
      setLoading(true);

      console.log('=== CLIENT DEBUG INFO ===');
      console.log('Full client object:', client);
      console.log('Client ID:', client?.id);
      console.log('Client user_id:', client?.user_id);
      console.log('Client type:', typeof client?.id);
      console.log('Client ID type:', typeof client?.id);
      console.log('Client user_id type:', typeof client?.user_id);
      console.log('=== END CLIENT DEBUG ===');

      // First, let's check what groups exist in the database
      const { data: allGroups, error: allGroupsError } = await supabase
        .from('groups')
        .select('*')
        .order('name');
      
      console.log('=== ALL GROUPS DEBUG ===');
      console.log('All groups in database:', allGroups);
      console.log('All groups count:', allGroups?.length);
      console.log('All groups error:', allGroupsError);
      
      if (allGroups && allGroups.length > 0) {
        console.log('Sample group structure:', allGroups[0]);
        console.log('Group client_id values:', allGroups.map(g => g.client_id));
        console.log('Group user_id values:', allGroups.map(g => g.user_id));
      }
      console.log('=== END ALL GROUPS DEBUG ===');

      // Try the exact same query as the original Campaigns page
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .eq('client_id', client?.id)
        .order('name');

      console.log('Groups query result (same as original):', groupsData);
      console.log('Groups query error (same as original):', groupsError);

      if (groupsError) {
        console.error('Error fetching groups:', groupsError);
        return;
      }

      console.log('Raw groups data:', groupsData);
      console.log('Groups count:', groupsData?.length);

      // Get contact counts for each group (same as original Campaigns page)
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

      // Fetch templates - use correct status column
      const { data: templatesData, error: templatesError } = await supabase
        .from('templates')
        .select('*')
        .eq('client_id', client?.id)
        .eq('whatsapp_status', 'enabled')
        .order('template_name');

      if (templatesError) {
        console.error('Error fetching templates:', templatesError);
        // Don't return, just log the error and continue
      }

      // Fetch media - make it optional since table might not exist
      let mediaData = [];
      try {
        const { data: mediaResult, error: mediaError } = await supabase
          .from('media')
          .select('*')
          .eq('client_id', client?.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (mediaError) {
          console.error('Error fetching media:', mediaError);
          mediaData = [];
        } else {
          mediaData = mediaResult || [];
        }
      } catch (error) {
        console.error('Media table might not exist:', error);
        mediaData = [];
      }

      console.log('=== FINAL RESULTS ===');
      console.log('Fetched groups:', groupsWithCount);
      console.log('Fetched groups count:', groupsWithCount?.length);
      console.log('Fetched templates:', templatesData);
      console.log('Fetched media:', mediaData);
      console.log('=== END FINAL RESULTS ===');
      
      // Debug: Log the actual group data structure
      if (groupsWithCount && groupsWithCount.length > 0) {
        console.log('=== GROUP DATA STRUCTURE ===');
        groupsWithCount.forEach((group, index) => {
          console.log(`Group ${index + 1}:`, {
            id: group.id,
            name: group.name,
            description: group.description,
            contact_count: group.contact_count,
            client_id: group.client_id,
            user_id: group.user_id
          });
        });
        console.log('=== END GROUP DATA STRUCTURE ===');
      }
      
      // If no groups found with client matching, show all groups as fallback for debugging
      if (groupsWithCount.length === 0 && allGroups && allGroups.length > 0) {
        console.log('No client-specific groups found, showing all groups as fallback');
        const fallbackGroups = allGroups.map(group => ({
          ...group,
          contact_count: 0 // We'll skip contact count for fallback
        }));
        setGroups(fallbackGroups);
      } else {
        setGroups(groupsWithCount);
      }
      
      setTemplates(templatesData || []);
      setMedia(mediaData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load campaign data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    setSelectedTemplate(template || null);
    setFormData(prev => ({ ...prev, template_id: templateId }));

    // Reset variable mappings and media selection when template changes
    setVariableMappings({});
    setSelectedMedia(null);

    if (template) {
      const content = getTemplateContent(template);
      const variables = extractVariables(content);
      const newMappings: { [key: string]: string } = {};
      variables.forEach(variable => {
        newMappings[variable] = '';
      });
      setVariableMappings(newMappings);

      // If template has a header (like "IMAGE"), load available media
      if (template.template_header) {
        await loadAvailableMedia(template.template_header.toLowerCase());
      } else {
        setAvailableMedia([]);
      }
    } else {
      setVariableMappings({});
      setAvailableMedia([]);
    }
  };

  const loadAvailableMedia = async (mediaType: string) => {
    try {
      const { data: media, error } = await supabase
        .from('media')
        .select('id, name, media_type, media_id, description')
        .eq('client_id', client?.id)
        .eq('media_type', mediaType)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading media:', error);
        return;
      }

      setAvailableMedia(media || []);
    } catch (error) {
      console.error('Error loading media:', error);
    }
  };

  const handleGroupChange = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    setSelectedGroup(group || null);
    setFormData(prev => ({ ...prev, group_id: groupId }));
  };

  // Enhanced contact selection functions
  const handleCreateNewList = async () => {
    if (!client || !newListName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a list name",
        variant: "destructive",
      });
      return;
    }

    setCreatingList(true);
    try {
      // Check if group name already exists
      const { data: existingGroup, error: checkError } = await supabase
        .from('groups')
        .select('id')
        .eq('name', newListName.trim())
        .eq('client_id', client.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw checkError;
      }

      if (existingGroup) {
        toast({
          title: "Error",
          description: "A contact list with this name already exists. Please choose a different name.",
          variant: "destructive",
        });
        setCreatingList(false);
        return;
      }

      const { data, error } = await supabase
        .from('groups')
        .insert({
          name: newListName.trim(),
          description: newListDescription.trim(),
          client_id: client.id,
          user_id: client.id, // Use client.id (client_users.id) for RLS policy
          created_by: client.id // Track who created this contact list
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Contact list "${newListName}" created successfully!`
      });

      // Create the updated group object with contact count (0 for empty list)
      const updatedGroup = {
        ...data,
        contact_count: 0
      };
      
      // Add the new group to the existing groups list
      setGroups(prev => [...prev, updatedGroup]);
      
      // Select the new group
      setSelectedGroup(updatedGroup);
      setFormData(prev => ({ ...prev, group_id: updatedGroup.id }));
      setShowCreateListDialog(false);
      setNewListName('');
      setNewListDescription('');

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingList(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: "Error",
        description: "Please select a valid CSV file",
        variant: "destructive",
      });
      return;
    }

    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  };

  const handleCreateListFromCsv = async () => {
    if (!client || !newListName.trim() || !csvContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter a list name and upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setCreatingListFromCsv(true);
    try {
      // Check if group name already exists
      const { data: existingGroup, error: checkError } = await supabase
        .from('groups')
        .select('id')
        .eq('name', newListName.trim())
        .eq('client_id', client.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw checkError;
      }

      if (existingGroup) {
        toast({
          title: "Error",
          description: "A contact list with this name already exists. Please choose a different name.",
          variant: "destructive",
        });
        setCreatingListFromCsv(false);
        return;
      }

      // First create the group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: newListName.trim(),
          description: newListDescription.trim() || `Created from CSV: ${csvFile?.name}`,
          client_id: client.id,
          user_id: client.id // Use client.id (client_users.id) for RLS policy
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Then import contacts from CSV
      const { data: result, error } = await supabase.rpc('import_contacts_from_csv_flexible', {
        csv_data: csvContent,
        group_id: groupData.id,
        p_client_id: client.id
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Contact list "${newListName}" created with ${data} contacts from CSV!`
      });

      // Create the updated group object with contact count
      const updatedGroup = {
        ...groupData,
        contact_count: data || 0
      };
      
      // Add the new group to the existing groups list
      setGroups(prev => [...prev, updatedGroup]);
      
      // Select the new group
      setSelectedGroup(updatedGroup);
      setFormData(prev => ({ ...prev, group_id: updatedGroup.id }));
      setShowCreateListDialog(false);
      setNewListName('');
      setNewListDescription('');
      setCsvFile(null);
      setCsvContent('');
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingListFromCsv(false);
    }
  };


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

  const getPreviewContent = (content: string): string => {
    let previewContent = content;
    extractVariables(content).forEach(variable => {
      const mappedField = variableMappings[variable];
      if (mappedField) {
        const fieldLabel = contactFieldOptions.find(option => option.value === mappedField)?.label || mappedField;
        previewContent = previewContent.replace(
          new RegExp(`\\{\\{${variable}\\}\\}`, 'g'),
          `[${fieldLabel}]`
        );
      }
    });
    return previewContent;
  };

  const canProceedToNext = (): boolean => {
    switch (currentStep) {
      case 1:
        return formData.name.trim() !== '' && !campaignNameError;
      case 2:
        if (contactSelectionType === 'existing') {
          return formData.group_id !== '' && selectedGroup && selectedGroup.contact_count > 0;
        } else if (contactSelectionType === 'manual') {
          return manualContacts.trim() !== '';
        } else if (contactSelectionType === 'csv') {
          return csvContent.trim() !== '';
        }
        return false;
      case 3:
        return formData.template_id !== '' && selectedTemplate && 
               (!selectedTemplate.template_header || selectedMedia);
      case 4:
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (canProceedToNext() && currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      setLoading(true);

      if (!formData.name) {
        toast({
          title: "Validation Error",
          description: "Please fill in campaign name",
          variant: "destructive",
        });
        return;
      }

      // Template is required for all entries
      if (!formData.template_id) {
        toast({
          title: "Validation Error",
          description: "Please select a template",
          variant: "destructive",
        });
        return;
      }

      // Check if media is required and selected for media templates (only for non-manual entries)
      if (contactSelectionType !== 'manual' && selectedTemplate?.template_header && (!selectedMedia || !selectedMedia.id)) {
        toast({
          title: "Validation Error",
          description: "Please select media for this template",
          variant: "destructive",
        });
        return;
      }

      let groupId = formData.group_id;
      let actualContactCount = 0;

      // Handle different contact selection types
      if (contactSelectionType === 'existing') {
        if (!groupId) {
          toast({
            title: "Validation Error",
            description: "Please select a contact list",
            variant: "destructive",
          });
          return;
        }

        // Check if the selected group has contacts
        const { data: actualContacts, error: contactCountError, count: contactCount } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', groupId)
          .eq('client_id', client?.id);

        actualContactCount = contactCount || 0;

        if (actualContactCount === 0) {
          toast({
            title: "Validation Error",
            description: "The selected group has no contacts. Please add contacts to this group first.",
            variant: "destructive",
          });
          return;
        }
      } else if (contactSelectionType === 'manual') {
        // For manual entry, create a temporary group and insert contacts directly
        const { data: tempGroup, error: groupError } = await supabase
          .from('groups')
          .insert({
            name: `${formData.name} - Manual Contacts`,
            description: 'Temporary group for manual contacts',
            client_id: client?.id,
            user_id: client?.id
          })
          .select()
          .single();

        if (groupError) throw groupError;
        groupId = tempGroup.id;

        // Parse manual contacts (format: phone numbers only)
        const phoneNumbers = manualContacts.split(/[,\n]/).map(phone => phone.trim()).filter(phone => phone);
        
        // Automatically add +91 if country code is missing
        const processedPhones = phoneNumbers.map(phone => {
          if (!phone.startsWith('+')) {
            // Remove any leading zeros and add +91
            const cleanPhone = phone.replace(/^0+/, '');
            return `+91${cleanPhone}`;
          }
          return phone;
        });
        
        const contacts = processedPhones.map(phone => ({
          name: '', // No name for manual entry
          phone: phone,
          email: null, // No email for manual entry
          group_id: groupId,
          client_id: client?.id,
          user_id: client?.id
        }));

        if (contacts.length === 0) {
          toast({
            title: "Validation Error",
            description: "No valid phone numbers found. Please enter at least one phone number.",
            variant: "destructive",
          });
          return;
        }

        // Insert contacts
        const { error: contactsError } = await supabase
          .from('contacts')
          .insert(contacts);

        if (contactsError) throw contactsError;
        actualContactCount = contacts.length;
      } else if (contactSelectionType === 'csv') {
        // Create a temporary group for CSV contacts
        const { data: tempGroup, error: groupError } = await supabase
          .from('groups')
          .insert({
            name: `${formData.name} - CSV Contacts`,
            description: `Created from CSV: ${csvFile?.name}`,
            client_id: client?.id,
            user_id: client?.client_id
          })
          .select()
          .single();

        if (groupError) throw groupError;
        groupId = tempGroup.id;

        // Import contacts from CSV
        const { data: result, error } = await supabase.rpc('import_contacts_from_csv_flexible', {
          csv_data: csvContent,
          group_id: groupId,
          p_client_id: client?.id
        });

        if (error) throw error;
        actualContactCount = result?.inserted_count || 0;
      }

      // Determine campaign status based on type
      let campaignStatus = 'draft';
      if (formData.campaign_type === 'send_now') {
        campaignStatus = 'sending';
      } else if (formData.campaign_type === 'scheduled') {
        campaignStatus = 'scheduled';
      }

      const campaignData = {
        name: formData.name,
        description: formData.description,
        message_content: selectedTemplate ? getTemplateContent(selectedTemplate) : '',
        message_type: 'text',
        target_groups: [groupId],
        user_id: client?.client_id, // Use client_id to reference clients table
        client_id: client?.id, // Use client_users.id for client_id
        created_by: client?.id, // Use client_users.id for created_by (who created this campaign)
        added_by: client?.id, // Use client_users.id for added_by (required field)
        group_id: groupId,
        template_id: formData.template_id,
        status: campaignStatus,
        scheduled_for: formData.scheduled_for ? formData.scheduled_for.toISOString() : null,
        variable_mappings: contactSelectionType === 'manual' ? {} : variableMappings,
        selected_media_id: contactSelectionType === 'manual' ? null : (selectedMedia?.media_id || null),
        selected_media_type: contactSelectionType === 'manual' ? null : (selectedMedia?.media_type || null)
      };

      const { data, error } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (error) {
        console.error('Campaign creation error:', error);
        toast({
          title: "Error",
          description: "Failed to create campaign. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Campaign "${formData.name}" created successfully!`
      });

      // Reset form and close wizard
      setFormData({
        name: '',
        description: '',
        group_id: '',
        template_id: '',
        scheduled_for: null,
        campaign_type: 'draft'
      });
      setSelectedTemplate(null);
      setSelectedGroup(null);
      setSelectedMedia(null);
      setVariableMappings({});
      setCurrentStep(1);
      onCampaignCreated();
      onClose();

    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (stepId: number, Icon: any) => {
    if (stepId < currentStep) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (stepId === currentStep) {
      return <Icon className="h-5 w-5 text-primary" />;
    } else {
      return <Icon className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <FileText className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Campaign Details</h3>
              <p className="text-muted-foreground">Give your campaign a name and description</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter campaign name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, name: e.target.value }));
                    // Debounce the duplicate check
                    setTimeout(() => checkCampaignNameDuplicate(e.target.value), 500);
                  }}
                  className={campaignNameError ? 'border-red-500' : ''}
                />
                {campaignNameError && (
                  <p className="text-sm text-red-500">{campaignNameError}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the campaign (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Users className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Select Contact List</h3>
              <p className="text-muted-foreground">Choose how you want to select your target audience</p>
            </div>
            
            <Tabs value={contactSelectionType} onValueChange={(value) => setContactSelectionType(value as 'existing' | 'manual' | 'csv')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="existing" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Existing Lists
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Manual Entry
                </TabsTrigger>
                <TabsTrigger value="csv" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload CSV
                </TabsTrigger>
              </TabsList>

              <TabsContent value="existing" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Select Existing Contact List *</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateListDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New List
                    </Button>
                  </div>
                  
                  <Select value={formData.group_id} onValueChange={handleGroupChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a contact list" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          No contact lists found. Create a new one using the button above.
                        </div>
                      ) : (
                        groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{group.name}</span>
                              <Badge variant="outline" className="ml-2">
                                {group.contact_count} contacts
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  
                  {selectedGroup && (
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">{selectedGroup.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{selectedGroup.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{selectedGroup.contact_count} contacts</Badge>
                        {selectedGroup.contact_count === 0 && (
                          <Badge variant="destructive">No contacts</Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {selectedGroup && selectedGroup.contact_count === 0 && (
                    <div className="p-4 border border-amber-200 rounded-lg bg-amber-50">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="font-medium text-amber-800">No contacts in this group</span>
                      </div>
                      <p className="text-sm text-amber-700 mt-1">
                        This group has no contacts. Please add contacts to this group before creating a campaign.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Enter Phone Numbers Manually *</Label>
                    <p className="text-sm text-muted-foreground">
                      Enter phone numbers separated by commas. +91 will be added automatically if not provided
                    </p>
                    <Textarea
                      placeholder="9876543210&#10;+19123456789&#10;9123456789"
                      value={manualContacts}
                      onChange={(e) => setManualContacts(e.target.value)}
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </div>
                  
                  {manualContacts.trim() && (
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <UserPlus className="h-4 w-4" />
                        <span className="font-medium">Manual Contacts Preview</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {manualContacts.split(/[,\n]/).filter(phone => phone.trim()).length} contacts will be added
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">Ready to Proceed</span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      Your manually entered contacts will be used directly for this campaign. No need to create or select a list.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="csv" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Upload CSV File *</Label>
                    <p className="text-sm text-muted-foreground">
                      Upload a CSV file. Required column: Contact (phone number). Optional columns: Name, Email, Tags, Notes.
                      <br />
                      <strong>Expected format:</strong> Contact, Name, Email, Tags, Notes
                    </p>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose CSV File
                      </Button>
                    </div>
                    
                    {csvFile && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded">
                        <span className="text-sm">{csvFile.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCsvFile(null);
                            setCsvContent('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {csvContent && (
                    <div className="space-y-2">
                      <Label>CSV Preview (first 5 rows)</Label>
                      <div className="p-3 bg-muted rounded text-sm font-mono max-h-32 overflow-y-auto">
                        <pre className="whitespace-pre-wrap break-words overflow-wrap-anywhere">{csvContent.split('\n').slice(0, 6).join('\n')}</pre>
                      </div>
                    </div>
                  )}
                  
                  {csvContent && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateListDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create List from CSV
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <MessageSquare className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Message Template</h3>
              <p className="text-muted-foreground">Choose your message template and media</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Message Template *</Label>
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
              </div>
              
              {selectedTemplate && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="font-medium">{selectedTemplate.template_name}</span>
                    <Badge variant="secondary">{selectedTemplate.category}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {getTemplateContent(selectedTemplate)}
                  </div>
                </div>
              )}

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
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Send className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Campaign Action</h3>
              <p className="text-muted-foreground">Choose what to do with your campaign</p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {/* Draft Option */}
                <div
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    formData.campaign_type === 'draft'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, campaign_type: 'draft' }))}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      formData.campaign_type === 'draft' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Save as Draft</h4>
                      <p className="text-sm text-muted-foreground">
                        Save the campaign for later editing and sending
                      </p>
                    </div>
                    {formData.campaign_type === 'draft' && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>

                {/* Schedule Option */}
                <div
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    formData.campaign_type === 'scheduled'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, campaign_type: 'scheduled' }))}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      formData.campaign_type === 'scheduled' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Schedule for Later</h4>
                      <p className="text-sm text-muted-foreground">
                        Set a specific date and time to send the campaign
                      </p>
                    </div>
                    {formData.campaign_type === 'scheduled' && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>

                {/* Send Now Option */}
                <div
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    formData.campaign_type === 'send_now'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, campaign_type: 'send_now' }))}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      formData.campaign_type === 'send_now' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Send className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Send Now</h4>
                      <p className="text-sm text-muted-foreground">
                        Send the campaign immediately to all contacts
                      </p>
                    </div>
                    {formData.campaign_type === 'send_now' && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
              </div>

              {/* Schedule Date/Time Picker */}
              {formData.campaign_type === 'scheduled' && (
                <div className="space-y-2">
                  <Label>Schedule Date & Time</Label>
                  <DateTimePicker
                    value={formData.scheduled_for}
                    onChange={(date) => setFormData(prev => ({ ...prev, scheduled_for: date }))}
                    placeholder="Select date and time"
                  />
                </div>
              )}

              {/* Campaign Summary */}
              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-3">Campaign Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{formData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contact List:</span>
                    <span className="font-medium">{selectedGroup?.name} ({selectedGroup?.contact_count} contacts)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Template:</span>
                    <span className="font-medium">{selectedTemplate?.template_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Action:</span>
                    <span className="font-medium capitalize">{formData.campaign_type.replace('_', ' ')}</span>
                  </div>
                  {formData.campaign_type === 'scheduled' && formData.scheduled_for && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scheduled for:</span>
                      <span className="font-medium">{formData.scheduled_for.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Create New Campaign</CardTitle>
              <CardDescription>
                Step {currentStep} of 4: {steps[currentStep - 1].title}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={(currentStep / 4) * 100} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              {steps.map((step) => (
                <span key={step.id} className={step.id <= currentStep ? 'text-primary' : ''}>
                  {step.title}
                </span>
              ))}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 overflow-y-auto flex-1 min-h-0">
          {clientLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading client data...</span>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            renderStepContent()
          )}
        </CardContent>
        
        <div className="border-t p-6 pb-8 flex-shrink-0">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              
              {currentStep < 4 ? (
                <Button
                  onClick={nextStep}
                  disabled={!canProceedToNext()}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreateCampaign}
                  disabled={loading || !canProceedToNext()}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Create Campaign
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Create List Dialog */}
      {showCreateListDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-60">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Contact List</CardTitle>
              <CardDescription>
                {contactSelectionType === 'manual' 
                  ? 'Create a new list from your manual contacts'
                  : contactSelectionType === 'csv'
                  ? 'Create a new list from your CSV file'
                  : 'Create a new empty contact list'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="list-name">List Name *</Label>
                <Input
                  id="list-name"
                  placeholder="Enter list name"
                  value={newListName}
                  onChange={(e) => {
                    setNewListName(e.target.value);
                    // Debounce the duplicate check
                    setTimeout(() => checkListNameDuplicate(e.target.value), 500);
                  }}
                  className={listNameError ? 'border-red-500' : ''}
                />
                {listNameError && (
                  <p className="text-sm text-red-500">{listNameError}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="list-description">Description</Label>
                <Textarea
                  id="list-description"
                  placeholder="Optional description"
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateListDialog(false);
                    setNewListName('');
                    setNewListDescription('');
                  }}
                >
                  Cancel
                </Button>
                
                {contactSelectionType === 'csv' ? (
                  <Button
                    onClick={handleCreateListFromCsv}
                    disabled={!newListName.trim() || !csvContent.trim() || creatingListFromCsv || !!listNameError}
                  >
                    {creatingListFromCsv ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Create List
                  </Button>
                ) : (
                  <Button
                    onClick={handleCreateNewList}
                    disabled={!newListName.trim() || creatingList || !!listNameError}
                  >
                    {creatingList ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Create List
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
