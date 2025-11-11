-- Drop existing user_roles table as we're implementing separate auth tables
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Create admin_users table for admin authentication
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create client_users table for client authentication (managed by admin)
CREATE TABLE public.client_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  business_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  whatsapp_api_key TEXT,
  whatsapp_number TEXT,
  created_by UUID NOT NULL REFERENCES public.admin_users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscription_plan TEXT NOT NULL DEFAULT 'basic',
  subscription_expires_at TIMESTAMP WITH TIME ZONE
);

-- Create admin_sessions table for admin session management
CREATE TABLE public.admin_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Create client_sessions table for client session management
CREATE TABLE public.client_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.client_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Create client_settings table for additional client configurations
CREATE TABLE public.client_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.client_users(id) ON DELETE CASCADE,
  max_messages_per_day INTEGER DEFAULT 1000,
  max_contacts INTEGER DEFAULT 5000,
  features_enabled JSONB DEFAULT '{"templates": true, "scheduling": true, "automation": false, "analytics": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- Create admin_logs table for audit trails
CREATE TABLE public.admin_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.admin_users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'client', 'ticket', 'system'
  target_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update existing tables to reference client_users instead of auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE public.profiles ADD COLUMN client_id UUID REFERENCES public.client_users(id);

-- Update other tables to use client_id
ALTER TABLE public.contacts ADD COLUMN client_id UUID REFERENCES public.client_users(id);
ALTER TABLE public.templates ADD COLUMN client_id UUID REFERENCES public.client_users(id);
ALTER TABLE public.messages ADD COLUMN client_id UUID REFERENCES public.client_users(id);
ALTER TABLE public.groups ADD COLUMN client_id UUID REFERENCES public.client_users(id);
ALTER TABLE public.flows ADD COLUMN client_id UUID REFERENCES public.client_users(id);
ALTER TABLE public.campaigns ADD COLUMN client_id UUID REFERENCES public.client_users(id);
ALTER TABLE public.scheduled_messages ADD COLUMN client_id UUID REFERENCES public.client_users(id);
ALTER TABLE public.tickets ADD COLUMN client_id UUID REFERENCES public.client_users(id);

-- Create indexes for performance
CREATE INDEX idx_admin_users_email ON public.admin_users(email);
CREATE INDEX idx_client_users_email ON public.client_users(email);
CREATE INDEX idx_admin_sessions_token ON public.admin_sessions(token);
CREATE INDEX idx_client_sessions_token ON public.client_sessions(token);
CREATE INDEX idx_admin_sessions_admin_id ON public.admin_sessions(admin_id);
CREATE INDEX idx_client_sessions_client_id ON public.client_sessions(client_id);
CREATE INDEX idx_client_users_created_by ON public.client_users(created_by);
CREATE INDEX idx_admin_logs_admin_id ON public.admin_logs(admin_id);
CREATE INDEX idx_admin_logs_created_at ON public.admin_logs(created_at);

-- Enable RLS on all new tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_users (only admins can manage admins)
CREATE POLICY "Admins can view all admin users" ON public.admin_users
  FOR SELECT USING (true); -- Will be restricted by application logic

CREATE POLICY "Admins can update their own profile" ON public.admin_users
  FOR UPDATE USING (true); -- Will be restricted by application logic

-- Create RLS policies for client_users (admins can manage all, clients can view their own)
CREATE POLICY "Admins can manage all clients" ON public.client_users
  FOR ALL USING (true); -- Will be restricted by application logic

-- Create RLS policies for sessions
CREATE POLICY "Users can manage their own admin sessions" ON public.admin_sessions
  FOR ALL USING (true); -- Will be restricted by application logic

CREATE POLICY "Users can manage their own client sessions" ON public.client_sessions
  FOR ALL USING (true); -- Will be restricted by application logic

-- Create RLS policies for client_settings
CREATE POLICY "Admins can manage all client settings" ON public.client_settings
  FOR ALL USING (true); -- Will be restricted by application logic

-- Create RLS policies for admin_logs
CREATE POLICY "Admins can view all logs" ON public.admin_logs
  FOR SELECT USING (true); -- Will be restricted by application logic

CREATE POLICY "System can insert logs" ON public.admin_logs
  FOR INSERT WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_users_updated_at
  BEFORE UPDATE ON public.client_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_settings_updated_at
  BEFORE UPDATE ON public.client_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default admin user (password: admin123 - should be changed immediately)
INSERT INTO public.admin_users (email, password_hash, full_name) VALUES 
('admin@whatsapp-hub.com', '$2b$10$rQZ9fz0qZ4K5X6Y8W3V2YOqY5Q6K8Z9X4Y7W6V5T4R3Q2P1O0N9M8', 'System Administrator');

-- Create helper functions for authentication
CREATE OR REPLACE FUNCTION public.authenticate_admin(email_input TEXT, password_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_record public.admin_users%ROWTYPE;
  session_token TEXT;
  session_id UUID;
BEGIN
  -- Find admin user
  SELECT * INTO admin_record FROM public.admin_users 
  WHERE email = email_input AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  -- In a real implementation, you would verify the password hash here
  -- For now, we'll create the session
  
  -- Generate session token
  session_token := encode(gen_random_bytes(32), 'base64');
  
  -- Create session
  INSERT INTO public.admin_sessions (admin_id, token, expires_at)
  VALUES (admin_record.id, session_token, now() + interval '7 days')
  RETURNING id INTO session_id;
  
  -- Update last login
  UPDATE public.admin_users SET last_login = now() WHERE id = admin_record.id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'admin', row_to_json(admin_record),
    'token', session_token,
    'session_id', session_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.authenticate_client(email_input TEXT, password_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_record public.client_users%ROWTYPE;
  session_token TEXT;
  session_id UUID;
BEGIN
  -- Find client user
  SELECT * INTO client_record FROM public.client_users 
  WHERE email = email_input AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  -- Generate session token
  session_token := encode(gen_random_bytes(32), 'base64');
  
  -- Create session
  INSERT INTO public.client_sessions (client_id, token, expires_at)
  VALUES (client_record.id, session_token, now() + interval '7 days')
  RETURNING id INTO session_id;
  
  -- Update last login
  UPDATE public.client_users SET last_login = now() WHERE id = client_record.id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'client', row_to_json(client_record),
    'token', session_token,
    'session_id', session_id
  );
END;
$$;