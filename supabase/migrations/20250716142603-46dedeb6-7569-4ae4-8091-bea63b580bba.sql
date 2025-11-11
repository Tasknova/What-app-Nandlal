-- Fix function search paths for security
ALTER FUNCTION public.authenticate_admin(text, text) SET search_path = public;
ALTER FUNCTION public.authenticate_client(text, text) SET search_path = public;
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Fix RLS policies for tickets table
DROP POLICY IF EXISTS "Users can create their own tickets" ON public.tickets;
CREATE POLICY "Users can create their own tickets" ON public.tickets
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix RLS policies for messages table  
DROP POLICY IF EXISTS "Users can create their own messages" ON public.messages;
CREATE POLICY "Users can create their own messages" ON public.messages
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add missing user_roles table and functions if needed
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
    CREATE TABLE public.user_roles (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      role app_role NOT NULL DEFAULT 'user',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      UNIQUE(user_id, role)
    );
    
    -- Enable RLS
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);
    
    CREATE POLICY "System can manage user roles" ON public.user_roles
    FOR ALL USING (true);
  END IF;
END $$;

-- Create trigger for user_roles updated_at
CREATE OR REPLACE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update profiles table to ensure proper user_id constraint
ALTER TABLE public.profiles 
  ALTER COLUMN user_id SET NOT NULL;