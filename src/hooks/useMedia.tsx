import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from './useClientAuth';

interface MediaItem {
  identifier: string;
  creationTime: number;
  description: string;
  mediaType: 'image' | 'video' | 'doc' | 'audio';
  mediaId: string;
  wabaNumber: number;
  status: string;
}

interface MediaResponse {
  status: string;
  mediaList: string;
  statusCode: string;
  reason: string;
}

interface DatabaseMedia {
  id: string;
  user_id: string;
  client_id: string | null;
  name: string;
  creation_time: number;
  description: string | null;
  media_type: string;
  media_id: string;
  status: string;
  waba_number: number | null;
  created_at: string;
  updated_at: string;
}

export const useMedia = () => {
  const { client, getOriginalClientCredentials } = useClientAuth();
  const [media, setMedia] = useState<DatabaseMedia[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const fetchMediaFromAPI = useCallback(async () => {
    console.log('Client data:', client);
    
    // Get original client credentials for API calls
    const originalCredentials = await getOriginalClientCredentials();
    if (!originalCredentials) {
      setError('Unable to fetch client credentials');
      return;
    }

    const { user_id: userId, api_key: apiKey, whatsapp_number: wabaNumber } = originalCredentials;
    console.log('Using original client credentials:', {
      userId,
      apiKey: apiKey ? 'Present' : 'Missing',
      wabaNumber
    });
    
    if (!apiKey || !userId) {
      setError(`API credentials not available. API Key: ${!!apiKey}, User ID: ${!!userId}`);
      return null;
    }

    try {
      // Use proxy server to bypass CORS
      console.log('Making media API call through proxy');
      
      const response = await fetch('/api/fetch-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userId,
          apiKey: apiKey // Use original client's API key
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Proxy response data:', data);
      
      if (data.success && data.media) {
        console.log('Returning media data:', data.media);
        return data.media;
      } else {
        // Check if it's an invalid credentials error
        if (data.error && data.error.includes('Invalid credentials')) {
          throw new Error('Invalid API credentials. Please contact your administrator to update your WhatsApp Business API credentials.');
        }
        throw new Error(data.error || 'Failed to fetch media');
      }
    } catch (error) {
      console.error('Error fetching media from API:', error);
      throw error;
    }
  }, [client?.id]); // Only depend on client.id to prevent excessive re-renders

  const syncMediaWithDatabase = useCallback(async () => {
    if (!client) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch media from API
      const apiMedia = await fetchMediaFromAPI();
      console.log('API Media received:', apiMedia);
      if (!apiMedia) return;

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
          console.log('Retrieved client_id from database:', clientOrgId);
        } else {
          console.error('Could not find client organization ID');
          throw new Error('Could not find client organization ID');
        }
      } catch (error) {
        console.error('Error fetching client_id:', error);
        throw error;
      }

      // First, get existing media records to preserve their added_by field
      const { data: existingMedia } = await supabase
        .from('media')
        .select('name, added_by')
        .eq('user_id', clientOrgId);

      const existingMediaMap = new Map(existingMedia?.map(item => [item.name, item.added_by]) || []);

      // Deduplicate API media by identifier to prevent conflict errors
      const uniqueApiMedia = apiMedia.reduce((unique: any[], current: any) => {
        const existingIndex = unique.findIndex(item => item.identifier === current.identifier);
        if (existingIndex === -1) {
          unique.push(current);
        } else {
          // Keep the most recent one (or you could merge them based on your logic)
          unique[existingIndex] = current;
        }
        return unique;
      }, []);

      // Prepare media data for upsert (update or insert)
      const mediaToUpsert = uniqueApiMedia.map((item, index) => ({
        user_id: clientOrgId, // Use the organization/client ID
        client_id: client.id, // Use the current client_user ID
        added_by: existingMediaMap.get(item.identifier) || '309a3786-c8bd-409d-8176-7f9964a37d06', // Preserve existing added_by or use primary user for new items
        name: item.identifier,
        creation_time: item.creationTime,
        description: item.description,
        media_type: item.mediaType,
        media_id: item.mediaId,
        status: item.status,
        waba_number: item.wabaNumber,
        updated_at: new Date().toISOString()
      }));

      // Use upsert to handle existing records with the same name
      const { data, error } = await supabase
        .from('media')
        .upsert(mediaToUpsert, { 
          onConflict: 'name',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

      console.log('Database insert result:', data);
      setMedia(data || []);
      setLastSync(new Date());
    } catch (error) {
      console.error('Error syncing media:', error);
      setError(error instanceof Error ? error.message : 'Failed to sync media');
    } finally {
      setIsLoading(false);
    }
  }, [client?.id, fetchMediaFromAPI]);

  const loadMediaFromDatabase = useCallback(async () => {
    if (!client) return;

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
          console.log('Retrieved client_id from database for query:', clientOrgId);
        } else {
          console.error('Could not find client organization ID');
          throw new Error('Could not find client organization ID');
        }
      } catch (error) {
        console.error('Error fetching client_id for query:', error);
        throw error;
      }

      const { data, error } = await supabase
        .from('media')
        .select('*')
        .eq('user_id', clientOrgId) // Query by user_id (organization ID)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('Loaded media from database:', data);
      setMedia(data || []);
    } catch (error) {
      console.error('Error loading media from database:', error);
      setError(error instanceof Error ? error.message : 'Failed to load media');
    }
  }, [client?.id]);

  // Initial load and sync
  useEffect(() => {
    if (client) {
      loadMediaFromDatabase();
      syncMediaWithDatabase();
    }
  }, [client?.id, loadMediaFromDatabase, syncMediaWithDatabase]);

  // Debug effect to log client data
  useEffect(() => {
    if (client) {
      console.log('Client loaded in useMedia:', {
        id: client.id,
        email: client.email,
        whatsapp_api_key: client.whatsapp_api_key ? 'Present' : 'Missing',
        user_id: client.user_id || 'Missing'
      });
    }
  }, [client?.id]);

  // Debug effect to log media state changes
  useEffect(() => {
    console.log('Media state updated:', {
      count: media.length,
      media: media
    });
  }, [media]);

  // Set up 5-minute interval for syncing (5 minutes = 5 * 60 * 1000 = 300,000 ms)
  useEffect(() => {
    if (!client) return;

    const interval = setInterval(() => {
      syncMediaWithDatabase();
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [client?.id, syncMediaWithDatabase]);

  const getMediaByType = useCallback((type: string) => {
    return media.filter(item => item.media_type === type);
  }, [media]);

  const getMediaById = useCallback((mediaId: string) => {
    return media.find(item => item.media_id === mediaId);
  }, [media]);



  return {
    media,
    isLoading,
    error,
    lastSync,
    syncMediaWithDatabase,
    getMediaByType,
    getMediaById,
    refresh: syncMediaWithDatabase
  };
}; 