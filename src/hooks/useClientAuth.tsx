import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClientUser {
  id: string;
  email: string;
  password: string;
  business_name: string;
  phone_number: string;
  whatsapp_api_key: string | null;
  whatsapp_number: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  is_active: boolean;
  subscription_plan: string;
  subscription_expires_at: string | null;
  user_id: string | null;
  organization_id: string | null;
  role_id: string | null;
  client_id: string | null;
  mem_password: string | null;
  is_primary_user: boolean | null;
  name: string | null;
}

interface ClientSession {
  client: ClientUser;
  token: string;
  session_id: string;
  password?: string; // Temporarily store password for API calls
}

interface ClientAuthContextType {
  client: ClientUser | null;
  session: ClientSession | null;
  isLoading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  debugSession: () => void;
  getOriginalClientCredentials: () => Promise<{ user_id: string; api_key: string; whatsapp_number: string; password: string } | null>;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

export const useClientAuth = () => {
  const context = useContext(ClientAuthContext);
  if (!context) {
    throw new Error('useClientAuth must be used within ClientAuthProvider');
  }
  return context;
};

export const ClientAuthProvider = ({ children }: { children: ReactNode }) => {
  const [client, setClient] = useState<ClientUser | null>(null);
  const [session, setSession] = useState<ClientSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      // Clear admin session if client session exists (mutual exclusion)
      const adminSession = localStorage.getItem('admin_session');
      const clientSession = localStorage.getItem('client_session');
      
      if (clientSession && adminSession) {
        // If both sessions exist, prefer client session and clear admin
        localStorage.removeItem('admin_session');
      }
      
      // Check for existing session
      if (clientSession) {
        try {
          const parsedSession = JSON.parse(clientSession) as ClientSession;
          // Validate session is still valid
          if (parsedSession.client && parsedSession.session_id) {
            // Check if session exists in database and is still valid
            try {
              const { data: sessionData, error: sessionError } = await supabase
                .from('client_sessions')
                .select('*')
                .eq('id', parsedSession.session_id)
                .gt('expires_at', new Date().toISOString())
                .single();
              
              if (!sessionError && sessionData) {
                // Session is valid, update token and refresh client data
                parsedSession.token = sessionData.token; // Use the token from database
                try {
                  const { data, error } = await supabase
                    .from('client_users')
                    .select('*')
                    .eq('id', parsedSession.client.id)
                    .single();
                  
                  if (!error && data) {
                    parsedSession.client = data;
                    localStorage.setItem('client_session', JSON.stringify(parsedSession));
                    console.log('Refreshed client session with complete data and database token');

                  }
                } catch (error) {
                  console.error('Error refreshing client data:', error);
                }
                
                setSession(parsedSession);
                setClient(parsedSession.client);
              } else {
                // Session is invalid, remove it
                console.log('Session expired or invalid, removing from localStorage');
                localStorage.removeItem('client_session');
              }
            } catch (error) {
              console.error('Error validating session:', error);
              localStorage.removeItem('client_session');
            }
          } else {
            localStorage.removeItem('client_session');
          }
        } catch (error) {
          console.error('Error parsing stored session:', error);
          localStorage.removeItem('client_session');
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const signIn = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      // Clear any existing admin session when client logs in
      localStorage.removeItem('admin_session');
      
      // Authenticate client using email OR user_id and mem_password from client_users table
      const { data, error } = await supabase
        .from('client_users')
        .select('*')
        .or(`email.eq.${identifier},user_id.eq.${identifier}`)
        .eq('mem_password', password)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setIsLoading(false);
        return { error: 'Invalid email or password' };
      }


      // Check for existing valid session first
      const { data: existingSession, error: sessionCheckError } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('client_id', data.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let token: string;
      let session_id: string;

      if (existingSession && !sessionCheckError) {
        // Use existing session
        token = existingSession.token;
        session_id = existingSession.id;
        console.log('Using existing session:', session_id);
      } else {
        // Create new session
        token = crypto.randomUUID();
        session_id = crypto.randomUUID();

        // Create session record in database
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

        const { error: sessionError } = await supabase
          .from('client_sessions')
          .insert({
            id: session_id,
            client_id: data.id,
            token: token,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
          });

        if (sessionError) {
          console.error('Error creating session:', sessionError);
          setIsLoading(false);
          return { error: 'Failed to create session' };
        }
        console.log('Created new session:', session_id);
      }

      const sessionData: ClientSession = {
        client: data,
        token,
        session_id,
        password: password // Store password temporarily for API calls
      };
      
      setSession(sessionData);
      setClient(data);
      localStorage.setItem('client_session', JSON.stringify(sessionData));
      setIsLoading(false);
      return { error: null };
    } catch (error) {
      setIsLoading(false);
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    if (session) {
      // Delete session from database
      await supabase
        .from('client_sessions')
        .delete()
        .eq('id', session.session_id);
    }
    
    
    setClient(null);
    setSession(null);
    localStorage.removeItem('client_session');
    // Also clear admin session to ensure clean state
    localStorage.removeItem('admin_session');
  };

  const isAuthenticated = !!client && !!session;

  // Debug function to log session info
  const debugSession = () => {
    if (session) {
      console.log('=== SESSION DEBUG ===');
      console.log('Session ID:', session.session_id);
      console.log('Token length:', session.token?.length);
      console.log('Token preview:', session.token ? session.token.substring(0, 20) + '...' : 'NO_TOKEN');
      console.log('Client ID:', session.client?.id);
      console.log('Client email:', session.client?.email);
      console.log('=== END SESSION DEBUG ===');
    } else {
      console.log('No active session');
    }
  };

  const getOriginalClientCredentials = async () => {
    if (!client?.client_id) return null;

    try {
      // Get the original client credentials from the clients table
      const { data, error } = await supabase
        .from('clients')
        .select('user_id, api_key, wt_business_no, password')
        .eq('id', client.client_id)
        .single();

      if (error || !data) {
        console.error('Error fetching original client credentials:', error);
        return null;
      }

      return {
        user_id: data.user_id,
        api_key: data.api_key,
        whatsapp_number: data.wt_business_no,
        password: data.password
      };
    } catch (error) {
      console.error('Error fetching original client credentials:', error);
      return null;
    }
  };

  return (
    <ClientAuthContext.Provider value={{
      client,
      session,
      isLoading,
      signIn,
      signOut,
      isAuthenticated,
      debugSession,
      getOriginalClientCredentials
    }}>
      {children}
    </ClientAuthContext.Provider>
  );
};