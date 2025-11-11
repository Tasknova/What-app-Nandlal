import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MemberUser {
  id: string;
  name: string;
  email: string;
  mem_password: string;
  user_id: string;
  password: string;
  whatsapp_api_key: string;
  whatsapp_number: string;
  business_name: string;
  phone_number: string;
  is_active: boolean;
  is_primary_user: boolean;
  client_id: string;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    business_name: string;
    email: string;
    user_id: string;
  };
}

interface MemberSession {
  member: MemberUser;
  token: string;
  session_id: string;
}

interface MemberAuthContextType {
  member: MemberUser | null;
  session: MemberSession | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const MemberAuthContext = createContext<MemberAuthContextType | undefined>(undefined);

export const useMemberAuth = () => {
  const context = useContext(MemberAuthContext);
  if (!context) {
    throw new Error('useMemberAuth must be used within MemberAuthProvider');
  }
  return context;
};

export const MemberAuthProvider = ({ children }: { children: ReactNode }) => {
  const [member, setMember] = useState<MemberUser | null>(null);
  const [session, setSession] = useState<MemberSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      // Check for existing session
      const storedSession = localStorage.getItem('member_session');
      if (storedSession) {
        try {
          const parsedSession = JSON.parse(storedSession) as MemberSession;
          // Validate session is still valid
          if (parsedSession.member && parsedSession.token) {
            setSession(parsedSession);
            setMember(parsedSession.member);
          } else {
            localStorage.removeItem('member_session');
          }
        } catch (error) {
          console.error('Error parsing stored session:', error);
          localStorage.removeItem('member_session');
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Authenticate member using email and mem_password
      const { data, error } = await supabase
        .from('client_users')
        .select('*')
        .eq('email', email)
        .eq('mem_password', password)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        setIsLoading(false);
        return { error: `Database error: ${error.message}` };
      }

      if (!data) {
        setIsLoading(false);
        return { error: 'Invalid email or password' };
      }

      // Get client data separately
      let clientData = null;
      if (data.client_id) {
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('id, business_name, email, user_id')
          .eq('id', data.client_id)
          .single();
        
        if (!clientError && client) {
          clientData = client;
        }
      }

      // Generate a simple session token (in production, use proper JWT)
      const token = crypto.randomUUID();
      const session_id = crypto.randomUUID();

      const memberWithClient = {
        ...data,
        client: clientData
      };

      const sessionData: MemberSession = {
        member: memberWithClient,
        token,
        session_id
      };
      
      setSession(sessionData);
      setMember(data);
      localStorage.setItem('member_session', JSON.stringify(sessionData));
      setIsLoading(false);
      return { error: null };
    } catch (error) {
      setIsLoading(false);
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    setMember(null);
    setSession(null);
    localStorage.removeItem('member_session');
  };

  const isAuthenticated = !!member && !!session;

  return (
    <MemberAuthContext.Provider value={{
      member,
      session,
      isLoading,
      signIn,
      signOut,
      isAuthenticated
    }}>
      {children}
    </MemberAuthContext.Provider>
  );
};
