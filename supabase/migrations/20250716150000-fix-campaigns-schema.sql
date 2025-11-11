-- Fix campaigns table schema and add proper foreign key relationships

-- First, let's ensure we have the correct columns in campaigns table
DO $$ 
BEGIN
  -- Add template_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaigns' 
    AND column_name = 'template_id' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.campaigns ADD COLUMN template_id UUID;
  END IF;
  
  -- Add group_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaigns' 
    AND column_name = 'group_id' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.campaigns ADD COLUMN group_id UUID;
  END IF;
  
  -- Add client_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaigns' 
    AND column_name = 'client_id' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.campaigns ADD COLUMN client_id UUID;
  END IF;
END $$;

-- Add user_id field to client_users table for API compatibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_users' 
    AND column_name = 'user_id' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.client_users ADD COLUMN user_id UUID DEFAULT gen_random_uuid();
    -- Update existing records to have user_id = id
    UPDATE public.client_users SET user_id = id WHERE user_id IS NULL;
    -- Make user_id NOT NULL after setting values
    ALTER TABLE public.client_users ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  -- Add template_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'campaigns_template_id_fkey'
    AND table_name = 'campaigns'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.campaigns 
    ADD CONSTRAINT campaigns_template_id_fkey 
    FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE SET NULL;
  END IF;
  
  -- Add group_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'campaigns_group_id_fkey'
    AND table_name = 'campaigns'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.campaigns 
    ADD CONSTRAINT campaigns_group_id_fkey 
    FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL;
  END IF;
  
  -- Add client_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'campaigns_client_id_fkey'
    AND table_name = 'campaigns'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.campaigns 
    ADD CONSTRAINT campaigns_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES public.client_users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update RLS policies for campaigns table
DROP POLICY IF EXISTS "Users can view their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can create their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can update their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON public.campaigns;

CREATE POLICY "Client users can view their own campaigns" ON public.campaigns
FOR SELECT USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can create their own campaigns" ON public.campaigns
FOR INSERT WITH CHECK (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can update their own campaigns" ON public.campaigns
FOR UPDATE USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can delete their own campaigns" ON public.campaigns
FOR DELETE USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

-- Update RLS policies for groups table
DROP POLICY IF EXISTS "Users can view their own groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create their own groups" ON public.groups;
DROP POLICY IF EXISTS "Users can update their own groups" ON public.groups;
DROP POLICY IF EXISTS "Users can delete their own groups" ON public.groups;

CREATE POLICY "Client users can view their own groups" ON public.groups
FOR SELECT USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can create their own groups" ON public.groups
FOR INSERT WITH CHECK (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can update their own groups" ON public.groups
FOR UPDATE USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can delete their own groups" ON public.groups
FOR DELETE USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

-- Update RLS policies for templates table
DROP POLICY IF EXISTS "Users can view their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can create their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.templates;

CREATE POLICY "Client users can view their own templates" ON public.templates
FOR SELECT USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can create their own templates" ON public.templates
FOR INSERT WITH CHECK (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can update their own templates" ON public.templates
FOR UPDATE USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can delete their own templates" ON public.templates
FOR DELETE USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

-- Update RLS policies for contacts table to use client_id instead of user_id
DROP POLICY IF EXISTS "Client users can create their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Client users can view their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Client users can update their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Client users can delete their own contacts" ON public.contacts;

CREATE POLICY "Client users can create their own contacts" ON public.contacts
FOR INSERT WITH CHECK (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can view their own contacts" ON public.contacts
FOR SELECT USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can update their own contacts" ON public.contacts
FOR UPDATE USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can delete their own contacts" ON public.contacts
FOR DELETE USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

-- Update RLS policies for messages table to use client_id instead of user_id
DROP POLICY IF EXISTS "Client users can create their own messages" ON public.messages;
DROP POLICY IF EXISTS "Client users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Client users can update their own messages" ON public.messages;

CREATE POLICY "Client users can create their own messages" ON public.messages
FOR INSERT WITH CHECK (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can view their own messages" ON public.messages
FOR SELECT USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can update their own messages" ON public.messages
FOR UPDATE USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_client_id ON public.campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_template_id ON public.campaigns(template_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_group_id ON public.campaigns(group_id);
CREATE INDEX IF NOT EXISTS idx_groups_client_id ON public.groups(client_id);
CREATE INDEX IF NOT EXISTS idx_templates_client_id ON public.templates(client_id);
CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON public.contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON public.messages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_users_user_id ON public.client_users(user_id); 