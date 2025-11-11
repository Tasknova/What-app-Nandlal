import { useState, useEffect } from 'react';
import { useClientAuth } from './useClientAuth';

interface WalletBalance {
  smsBalance: string;
  expDate: string;
  userCreditType: string;
  endHour: string;
  startHour: string;
}

interface WalletResponse {
  response: {
    api: string;
    action: string;
    status: string;
    msg: string;
    code: string;
    count: number;
    account: WalletBalance;
  };
}

export const useWalletBalance = () => {
  const { client, getOriginalClientCredentials } = useClientAuth();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWalletBalance = async () => {
    if (!client) {
      setError('User not authenticated');
      return;
    }

    // Get original client credentials for API calls
    const originalCredentials = await getOriginalClientCredentials();
    if (!originalCredentials) {
      setError('Unable to fetch client credentials');
      return;
    }

    const { user_id: userId, api_key: apiKey } = originalCredentials;
    if (!userId || !apiKey) {
      setError('Missing credentials');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/fetch-wallet-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userId, // Use original client's user_id
          apiKey: apiKey  // Use original client's API key
        })
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('API endpoint not found. Please ensure the proxy server is running or deploy to production.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setBalance(data.balance);
      } else {
        throw new Error(data.error || 'Failed to fetch wallet balance');
      }
    } catch (err) {
      console.error('Error fetching wallet balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (client?.user_id && client?.whatsapp_api_key) {
      fetchWalletBalance();
    }
  }, [client?.user_id, client?.whatsapp_api_key]);

  const formatBalance = (balance: string) => {
    const numBalance = parseFloat(balance);
    if (isNaN(numBalance)) return '0.00';
    
    // Format with commas for thousands and 2 decimal places
    return numBalance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatExpiryDate = (timestamp: string) => {
    const date = new Date(parseInt(timestamp));
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return {
    balance,
    loading,
    error,
    fetchWalletBalance,
    formatBalance,
    formatExpiryDate
  };
};
