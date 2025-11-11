import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Client {
  id: string;
  organization_name: string;
  whatsapp_number: string;
  user_id: string;
  whatsapp_api_key: string;
}

interface Template {
  id: string;
  user_id: string;
  client_id: string | null;
  template_name: string;
  creation_time: number;
  whatsapp_status: string;
  system_status: string;
  media_type: string;
  language: string;
  category: string;
  template_body: string | null;
  template_header: string | null;
  template_footer: string | null;
  buttons1_type: string | null;
  buttons1_title: string | null;
  created_at: string;
  updated_at: string;
  client?: {
    organization_name: string;
    whatsapp_number: string;
  };
}

export const useAdminTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, organization_name, whatsapp_number, user_id, whatsapp_api_key')
        .eq('is_active', true);

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('templates')
        .select(`
          *,
          client:clients(organization_name, whatsapp_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('Failed to fetch templates');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncTemplatesForClient = useCallback(async (client: Client) => {
    try {
      // Get password for this client
      const { data: clientData, error: clientError } = await supabase
        .from('client_users')
        .select('password')
        .eq('client_id', client.id)
        .single();

      if (clientError || !clientData) {
        throw new Error(`Failed to get credentials for client ${client.organization_name}`);
      }

      // Fetch templates from API
      const response = await fetch('/api/fetch-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: client.user_id,
          apiKey: client.whatsapp_api_key,
          wabaNumber: client.whatsapp_number
        })
      });

      const data = await response.json();

      if (response.ok && data.success && data.templates) {
        // Process and store templates in database
        for (const template of data.templates) {
          const templateData = {
            user_id: client.id, // Use client organization ID
            client_id: client.id,
            template_name: template.templateName,
            creation_time: template.creationTime,
            whatsapp_status: template.whatsAppStatus,
            system_status: template.systemStatus,
            media_type: template.mediaType,
            language: template.language,
            category: template.category,
            template_body: template.template?.body || null,
            template_header: template.template?.header || null,
            template_footer: template.template?.footer || null,
            buttons1_type: template.template?.buttons1_type || null,
            buttons1_title: template.template?.buttons1_title || null
          };

          // Upsert template (insert or update)
          await supabase
            .from('templates')
            .upsert(templateData, { onConflict: 'template_name,user_id' });
        }
      } else {
        throw new Error(`Failed to fetch templates for ${client.organization_name}: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Error syncing templates for client ${client.organization_name}:`, error);
      throw error;
    }
  }, []);

  const syncAllTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Sync templates for all clients
      for (const client of clients) {
        try {
          await syncTemplatesForClient(client);
                 } catch (error) {
           console.error(`Error syncing templates for client ${client.organization_name}:`, error);
           // Continue with other clients even if one fails
         }
      }

      // Refresh templates list
      await fetchTemplates();
    } catch (error) {
      console.error('Error syncing all templates:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [clients, syncTemplatesForClient, fetchTemplates]);

  const deleteTemplate = useCallback(async (template: Template) => {
    try {
      // Find the client for this template
      const client = clients.find(c => c.user_id === template.user_id);
      if (!client) {
        throw new Error('Client not found for this template');
      }

      // Get password from client_users table
      const { data: clientData, error: clientError } = await supabase
        .from('client_users')
        .select('password')
        .eq('client_id', client.id)
        .single();

      if (clientError || !clientData) {
        throw new Error('Failed to get client credentials');
      }

      const response = await fetch('/api/delete-template', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: client.user_id,
          password: clientData.password,
          wabaNumber: client.whatsapp_number,
          templateName: template.template_name,
          language: template.language
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Remove from local state
        setTemplates(prev => prev.filter(t => t.id !== template.id));
        return { success: true };
      } else {
        throw new Error(data.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }, [clients]);

  const createTemplateForClient = useCallback(async (clientId: string, templateData: any) => {
    try {
      const client = clients.find(c => c.id === clientId);
      if (!client) {
        throw new Error('Client not found');
      }

      // Get password for this client
      const { data: clientData, error: clientError } = await supabase
        .from('client_users')
        .select('password')
        .eq('client_id', client.id)
        .single();

      if (clientError || !clientData) {
        throw new Error('Failed to get client credentials');
      }

      const response = await fetch('http://localhost:3001/api/create-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: client.user_id,
          password: clientData.password,
          wabaNumber: client.whatsapp_number,
          apiKey: client.whatsapp_api_key,
          ...templateData
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Refresh templates list
        await fetchTemplates();
        return { success: true, data: data.template };
      } else {
        throw new Error(data.error || 'Failed to create template');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }, [clients, fetchTemplates]);

  const getTemplatesByClient = useCallback((clientId: string) => {
    return templates.filter(template => template.user_id === clientId);
  }, [templates]);

  const getTemplatesByCategory = useCallback((category: string) => {
    return templates.filter(template => template.category === category);
  }, [templates]);

  const getTemplatesByLanguage = useCallback((language: string) => {
    return templates.filter(template => template.language === language);
  }, [templates]);

  const getTemplatesByStatus = useCallback((status: string) => {
    return templates.filter(template => template.whatsapp_status === status);
  }, [templates]);

  useEffect(() => {
    fetchClients();
    fetchTemplates();
  }, [fetchClients, fetchTemplates]);

  return {
    templates,
    clients,
    isLoading,
    error,
    fetchTemplates,
    fetchClients,
    syncAllTemplates,
    syncTemplatesForClient,
    deleteTemplate,
    createTemplateForClient,
    getTemplatesByClient,
    getTemplatesByCategory,
    getTemplatesByLanguage,
    getTemplatesByStatus
  };
};

