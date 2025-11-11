import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from './useClientAuth';

export interface RecentActivity {
  id: string;
  type: 'campaign' | 'template' | 'contact' | 'message';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  icon: string;
  color: string;
}

export const useRecentActivity = () => {
  const { client } = useClientAuth();
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentActivities = useCallback(async () => {
    if (!client) {
      setActivities([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch recent data from multiple tables
      const [campaignsResult, templatesResult, contactsResult, messagesResult] = await Promise.all([
        supabase
          .from('campaigns')
          .select('id, name, status, created_at, updated_at')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('templates')
          .select('id, template_name, category, created_at, updated_at')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('contacts')
          .select('id, name, email, phone, created_at, updated_at')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('messages')
          .select('id, message_content, status, created_at, updated_at')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      // Check for errors
      if (campaignsResult.error) throw campaignsResult.error;
      if (templatesResult.error) throw templatesResult.error;
      if (contactsResult.error) throw contactsResult.error;
      if (messagesResult.error) throw messagesResult.error;

      // Transform data into activities
      const allActivities: RecentActivity[] = [];

      // Campaign activities
      (campaignsResult.data || []).forEach(campaign => {
        allActivities.push({
          id: campaign.id,
          type: 'campaign',
          title: `Campaign: ${campaign.name}`,
          description: `Campaign ${campaign.status === 'sent' ? 'completed' : campaign.status}`,
          timestamp: campaign.created_at,
          status: campaign.status,
          icon: 'Send',
          color: campaign.status === 'sent' ? 'green' : campaign.status === 'sending' ? 'blue' : 'gray'
        });
      });

      // Template activities
      (templatesResult.data || []).forEach(template => {
        allActivities.push({
          id: template.id,
          type: 'template',
          title: `Template: ${template.template_name}`,
          description: `Template created in ${template.category} category`,
          timestamp: template.created_at,
          icon: 'FileText',
          color: 'purple'
        });
      });

      // Contact activities
      (contactsResult.data || []).forEach(contact => {
        allActivities.push({
          id: contact.id,
          type: 'contact',
          title: `Contact: ${contact.name || contact.email || contact.phone}`,
          description: 'Contact added to database',
          timestamp: contact.created_at,
          icon: 'Users',
          color: 'blue'
        });
      });

      // Message activities
      (messagesResult.data || []).forEach(message => {
        allActivities.push({
          id: message.id,
          type: 'message',
          title: 'Message sent',
          description: message.message_content?.substring(0, 50) + (message.message_content?.length > 50 ? '...' : ''),
          timestamp: message.created_at,
          status: message.status,
          icon: 'MessageSquare',
          color: message.status === 'delivered' ? 'green' : message.status === 'sent' ? 'blue' : 'gray'
        });
      });

      // Sort all activities by timestamp (most recent first) and take top 10
      const sortedActivities = allActivities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      setActivities(sortedActivities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch recent activities');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchRecentActivities();
  }, [fetchRecentActivities]);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - activityTime.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  return {
    activities,
    loading,
    error,
    fetchRecentActivities,
    formatTimeAgo
  };
};
