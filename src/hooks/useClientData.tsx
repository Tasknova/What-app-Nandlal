import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from './useClientAuth';

interface ClientData {
  contacts: any[];
  templates: any[];
  messages: any[];
  campaigns: any[];
  loading: boolean;
  error: string | null;
}

export const useClientData = () => {
  const { client } = useClientAuth();
  const [data, setData] = useState<ClientData>({
    contacts: [],
    templates: [],
    messages: [],
    campaigns: [],
    loading: true,
    error: null
  });

  const fetchAllData = useCallback(async () => {
    if (!client) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Fetch all data in parallel for better performance
      const [contactsResult, templatesResult, messagesResult, campaignsResult] = await Promise.all([
        supabase
          .from('contacts')
          .select(`
            *,
            groups(
              id,
              name,
              description
            )
          `)
          .eq('client_id', client.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('templates')
          .select('*')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('messages')
          .select('*')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('campaigns')
          .select('*')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
      ]);

      // Check for errors
      if (contactsResult.error) throw contactsResult.error;
      if (templatesResult.error) throw templatesResult.error;
      if (messagesResult.error) throw messagesResult.error;
      if (campaignsResult.error) throw campaignsResult.error;

      // Process contacts to flatten group information
      const processedContacts = (contactsResult.data || []).map(contact => ({
        ...contact,
        groups: contact.groups ? [contact.groups] : []
      }));

      setData({
        contacts: processedContacts,
        templates: (templatesResult.data || []).map(template => ({
          ...template,
          variables: Array.isArray(template.variables) 
            ? template.variables.filter((v): v is string => typeof v === 'string')
            : []
        })),
        messages: messagesResult.data || [],
        campaigns: campaignsResult.data || [],
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching client data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch data'
      }));
    }
  }, [client]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const refreshData = useCallback(() => {
    fetchAllData();
  }, [fetchAllData]);

  const addContact = useCallback(async (contactData: any) => {
    if (!client) return { error: 'Not authenticated' };

    // Validate required fields
    if (!contactData.name?.trim()) {
      return { error: 'Name is required' };
    }
    
    if (!contactData.phone?.trim()) {
      return { error: 'Phone number is required' };
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(contactData.phone.replace(/\s+/g, ''))) {
      return { error: 'Please enter a valid phone number (e.g., +1234567890)' };
    }

    // Check for duplicate phone number
    const existingContact = data.contacts.find(
      contact => contact.phone === contactData.phone
    );
    if (existingContact) {
      return { error: 'A contact with this phone number already exists' };
    }

    // Validate email format if provided
    if (contactData.email && contactData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactData.email)) {
        return { error: 'Please enter a valid email address' };
      }
    }

    try {
      const { data: newContact, error } = await supabase
        .from('contacts')
        .insert([{ ...contactData, user_id: client.id }])
        .select(`
          *,
          groups(
            id,
            name,
            description
          )
        `)
        .single();

      if (error) {
        console.error('Contact creation error:', error);
        throw error;
      }

      const processedContact = {
        ...newContact,
        groups: newContact.groups ? [newContact.groups] : []
      };

      setData(prev => ({
        ...prev,
        contacts: [processedContact, ...prev.contacts]
      }));

      return { data: processedContact, error: null };
    } catch (error) {
      console.error('Add contact error:', error);
      return { error: error instanceof Error ? error.message : 'Failed to add contact' };
    }
  }, [client, data.contacts]);

  const updateContact = useCallback(async (id: string, updates: any) => {
    if (!client) return { error: 'Not authenticated' };

    try {
      const { data: updatedContact, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .eq('client_id', client.id)
        .select(`
          *,
          groups(
            id,
            name,
            description
          )
        `)
        .single();

      if (error) throw error;

      const processedContact = {
        ...updatedContact,
        groups: updatedContact.groups ? [updatedContact.groups] : []
      };

      setData(prev => ({
        ...prev,
        contacts: prev.contacts.map(contact => 
          contact.id === id ? processedContact : contact
        )
      }));

      return { data: processedContact, error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to update contact' };
    }
  }, [client]);

  const deleteContact = useCallback(async (id: string) => {
    if (!client) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id)
        .eq('client_id', client.id);

      if (error) throw error;

      setData(prev => ({
        ...prev,
        contacts: prev.contacts.filter(contact => contact.id !== id)
      }));

      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to delete contact' };
    }
  }, [client]);

  const addTemplate = useCallback(async (templateData: any) => {
    if (!client) return { error: 'Not authenticated' };

    try {
      // Get the client_id (from clients table) for this user
      let clientOrgId = client.id;
      try {
        // First try to get the client_id from the client_users table
        const { data: clientData, error: clientError } = await supabase
          .from('client_users')
          .select('client_id')
          .eq('id', client.id)
          .single();
        
        if (!clientError && clientData?.client_id) {
          clientOrgId = clientData.client_id;
          console.log('Retrieved client_id from database for addTemplate:', clientOrgId);
        } else {
          console.error('Could not find client organization ID');
          throw new Error('Could not find client organization ID');
        }
      } catch (error) {
        console.error('Error fetching client_id for addTemplate:', error);
        throw error;
      }

      const { data: newTemplate, error } = await supabase
        .from('templates')
        .insert([{ 
          ...templateData, 
          user_id: clientOrgId, // Use the organization/client ID
          client_id: client.id, // Use the current client_user ID
          added_by: client.id // Set added_by to the current client user
        }])
        .select()
        .single();

      if (error) {
        console.error('Template creation error:', error);
        // Handle unique constraint violation
        if (error.code === '23505' && error.message.includes('templates_name_unique')) {
          throw new Error('A template with this name already exists. Please choose a different name.');
        }
        throw error;
      }

      const processedTemplate = {
        ...newTemplate,
        variables: Array.isArray(newTemplate.variables) 
          ? newTemplate.variables.filter((v): v is string => typeof v === 'string')
          : []
      };

      setData(prev => ({
        ...prev,
        templates: [processedTemplate, ...prev.templates]
      }));

      return { data: processedTemplate, error: null };
    } catch (error) {
      console.error('Add template error:', error);
      return { error: error instanceof Error ? error.message : 'Failed to add template' };
    }
  }, [client]);

  const updateTemplate = useCallback(async (id: string, updates: any) => {
    if (!client) return { error: 'Not authenticated' };

    try {
      const { data: updatedTemplate, error } = await supabase
        .from('templates')
        .update(updates)
        .eq('id', id)
        .eq('client_id', client.id)
        .select()
        .single();

      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505' && error.message.includes('templates_name_unique')) {
          throw new Error('A template with this name already exists. Please choose a different name.');
        }
        throw error;
      }

      const processedTemplate = {
        ...updatedTemplate,
        variables: Array.isArray(updatedTemplate.variables) 
          ? updatedTemplate.variables.filter((v): v is string => typeof v === 'string')
          : []
      };

      setData(prev => ({
        ...prev,
        templates: prev.templates.map(template => 
          template.id === id ? processedTemplate : template
        )
      }));

      return { data: processedTemplate, error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to update template' };
    }
  }, [client]);

  const deleteTemplate = useCallback(async (id: string) => {
    if (!client) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id)
        .eq('client_id', client.id);

      if (error) throw error;

      setData(prev => ({
        ...prev,
        templates: prev.templates.filter(template => template.id !== id)
      }));

      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to delete template' };
    }
  }, [client]);

  const getStats = useCallback(() => {
    const today = new Date();
    const todayStr = today.toDateString();
    
    return {
      totalContacts: data.contacts.length,
      totalTemplates: data.templates.length,
      totalMessages: data.messages.length,
      totalCampaigns: data.campaigns.length,
      contactsWithEmail: data.contacts.filter(c => c.email).length,
      messagesDelivered: data.messages.filter(m => m.status === 'sent').length,
      messagesFailed: data.messages.filter(m => m.status === 'failed').length,
      messagesPending: data.messages.filter(m => m.status === 'pending').length,
      recentMessages: data.messages.filter(m => 
        new Date(m.created_at).toDateString() === todayStr
      ).length,
      recentContacts: data.contacts.filter(c => 
        new Date(c.created_at).toDateString() === todayStr
      ).length,
    };
  }, [data]);

  return {
    ...data,
    refreshData,
    addContact,
    updateContact,
    deleteContact,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getStats
  };
};