-- Update RLS policies to work with the custom client authentication system

-- Drop existing RLS policies that use auth.uid()
DROP POLICY IF EXISTS "Users can create their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.contacts;

DROP POLICY IF EXISTS "Users can create their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can view their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.templates;

DROP POLICY IF EXISTS "Users can create their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- Create new RLS policies for client_users system
-- Contacts policies
CREATE POLICY "Client users can create their own contacts" ON public.contacts
FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can view their own contacts" ON public.contacts
FOR SELECT USING (user_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can update their own contacts" ON public.contacts
FOR UPDATE USING (user_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can delete their own contacts" ON public.contacts
FOR DELETE USING (user_id IN (SELECT id FROM public.client_users WHERE is_active = true));

-- Templates policies  
CREATE POLICY "Client users can create their own templates" ON public.templates
FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can view their own templates" ON public.templates
FOR SELECT USING (user_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can update their own templates" ON public.templates
FOR UPDATE USING (user_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can delete their own templates" ON public.templates
FOR DELETE USING (user_id IN (SELECT id FROM public.client_users WHERE is_active = true));

-- Messages policies
CREATE POLICY "Client users can create their own messages" ON public.messages
FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can view their own messages" ON public.messages
FOR SELECT USING (user_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can update their own messages" ON public.messages
FOR UPDATE USING (user_id IN (SELECT id FROM public.client_users WHERE is_active = true));

-- Also create a security definer function for better performance
CREATE OR REPLACE FUNCTION public.is_active_client_user(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.client_users 
    WHERE id = user_id_param AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;