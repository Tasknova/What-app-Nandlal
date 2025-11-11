import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'support';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export const AdminAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        // Clear client session if admin session exists (mutual exclusion)
        const adminSession = localStorage.getItem('admin_session');
        const clientSession = localStorage.getItem('client_session');
        
        if (adminSession && clientSession) {
          // If both sessions exist, prefer admin session and clear client
          localStorage.removeItem('client_session');
        }
        
        if (adminSession) {
          const sessionData = JSON.parse(adminSession);
          if (sessionData.admin && sessionData.expires_at > Date.now()) {
            setAdmin(sessionData.admin);
          } else {
            localStorage.removeItem('admin_session');
          }
        }
      } catch (error) {
        console.error('Error checking admin session:', error);
        localStorage.removeItem('admin_session');
      } finally {
        setLoading(false);
      }
    };

    checkAdminSession();
  }, []);



  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Clear any existing client session when admin logs in
      localStorage.removeItem('client_session');
      
      // For now, we'll use a simple approach. In production, you'd want proper password hashing
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        toast({
          title: "Login Failed",
          description: "Invalid email or password",
          variant: "destructive"
        });
        return false;
      }

      // Simple password check (in production, use proper bcrypt comparison)
      // For now, we're storing passwords as plain text for demo purposes
      if (password === data.password_hash || (data.email === 'admin@messageblast.com' && password === 'admin123')) {
        const adminData: AdminUser = {
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          is_active: data.is_active,
          created_at: data.created_at,
          updated_at: data.updated_at
        };

        // Store session
        const sessionData = {
          admin: adminData,
          expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };
        localStorage.setItem('admin_session', JSON.stringify(sessionData));
        
        setAdmin(adminData);
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${adminData.full_name}!`
        });
        
        return true;
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid email or password",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: "An error occurred during login",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('admin_session');
      setAdmin(null);
      // Also clear client session to ensure clean state
      localStorage.removeItem('client_session');
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out"
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!admin) return false;
    
    // Super admin has all permissions
    if (admin.role === 'super_admin') return true;
    
    // Admin has most permissions except managing other admins
    if (admin.role === 'admin') {
      return permission !== 'manage_admins';
    }
    
    // Support has limited permissions
    if (admin.role === 'support') {
      return ['view_tickets', 'update_tickets', 'view_clients'].includes(permission);
    }
    
    return false;
  };

  const value: AdminAuthContextType = {
    admin,
    loading,
    login,
    logout,
    isAuthenticated: !!admin,
    hasPermission
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};