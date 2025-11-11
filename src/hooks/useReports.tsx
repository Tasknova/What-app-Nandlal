import { useState, useCallback } from 'react';
import { useClientAuth } from './useClientAuth';

export interface ReportRecord {
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

export interface ReportData {
  cursors: {
    next: string;
    start: string;
  };
  pages: {
    current: number;
    last: number;
  };
  records: ReportRecord[];
  counts: {
    total: number;
    current: number;
  };
}

export interface ReportFilters {
  fromDate: string;
  toDate: string;
  mobileNo: string;
  pageLimit: number;
  startCursor: string;
}

export const useReports = () => {
  const { client, getOriginalClientCredentials } = useClientAuth();
  const [reports, setReports] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async (filters: Partial<ReportFilters> = {}) => {
    if (!client) {
      setError('User not authenticated');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get original client credentials for API calls
      const originalCredentials = await getOriginalClientCredentials();
      if (!originalCredentials) {
        setError('Unable to fetch client credentials');
        return;
      }

      const requestBody = {
        userId: originalCredentials.user_id, // Use original client's user_id
        fromDate: filters.fromDate || '',
        toDate: filters.toDate || '',
        mobileNo: filters.mobileNo || '',
        pageLimit: filters.pageLimit || 100,
        startCursor: filters.startCursor || '1'
      };

       console.log('Reports API Request Body:', requestBody);

       const response = await fetch('/api/fetch-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
                 body: JSON.stringify(requestBody),
      });

             console.log('Reports API Response Status:', response.status);
       console.log('Reports API Response Headers:', response.headers);
       
       const responseText = await response.text();
       console.log('Reports API Response Text:', responseText);
       
       let data;
       try {
         data = JSON.parse(responseText);
       } catch (parseError) {
         console.error('JSON Parse Error:', parseError);
         console.error('Response Text:', responseText);
         throw new Error('Invalid JSON response from API');
       }

       if (response.ok && data.success) {
         setReports(data.data);
       } else {
         throw new Error(data.error || 'Failed to fetch reports');
       }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  const getStatusColor = useCallback((status: string) => {
    switch (status.toUpperCase()) {
      case 'DELIVERED':
        return 'bg-green-500/20 text-green-700';
      case 'READ':
        return 'bg-emerald-500/20 text-emerald-700';
      case 'FAILED':
        return 'bg-red-500/20 text-red-700';
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-700';
      case 'SENT':
        return 'bg-blue-500/20 text-blue-700';
      default:
        return 'bg-gray-500/20 text-gray-700';
    }
  }, []);

  const getMessageTypeColor = useCallback((msgType: string) => {
    switch (msgType.toLowerCase()) {
      case 'text':
        return 'bg-blue-500/20 text-blue-700';
      case 'media':
        return 'bg-purple-500/20 text-purple-700';
      case 'reply':
        return 'bg-orange-500/20 text-orange-700';
      case 'template':
        return 'bg-indigo-500/20 text-indigo-700';
      default:
        return 'bg-gray-500/20 text-gray-700';
    }
  }, []);

  const formatTimestamp = useCallback((timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  }, []);

  const formatMobileNumber = useCallback((mobileNo: number) => {
    return mobileNo.toString();
  }, []);

  const getBillingModelColor = useCallback((billingModel: string) => {
    switch (billingModel) {
      case 'MIC':
        return 'bg-green-500/20 text-green-700';
      case 'SIC':
        return 'bg-blue-500/20 text-blue-700';
      case 'MIC_PF':
        return 'bg-red-500/20 text-red-700';
      default:
        return 'bg-gray-500/20 text-gray-700';
    }
  }, []);

  const getDisplayStatus = useCallback((record: ReportRecord) => {
    // If readTime is available and greater than 0, show as READ
    if (record.readTime && record.readTime > 0) {
      return 'READ';
    }
    // Otherwise show the original status
    return record.status;
  }, []);

  return {
    reports,
    isLoading,
    error,
    fetchReports,
    getStatusColor,
    getMessageTypeColor,
    formatTimestamp,
    formatMobileNumber,
    getBillingModelColor,
    getDisplayStatus,
  };
};
