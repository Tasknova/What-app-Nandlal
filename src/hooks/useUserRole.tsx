import { useState, useEffect } from 'react';
import { useAdminAuth } from './useAdminAuth';
import { useClientAuth } from './useClientAuth';

export const useUserRole = () => {
  const { admin } = useAdminAuth();
  const { client } = useClientAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, [admin, client]);

  return {
    isAdmin: !!admin,
    isClient: !!client,
    loading: isLoading,
    role: admin ? 'admin' : client ? 'client' : null,
    user: admin || client
  };
};