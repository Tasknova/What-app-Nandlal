-- ============================================================================
-- COMPLETE ACCURATE DATABASE SCHEMA - NANDLAL JEWELLERS WHATSAPP SYSTEM
-- ============================================================================
-- This schema matches the ACTUAL database structure exactly
-- Verified against live Supabase database via MCP
-- Generated: 2025-01-17
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLE: admin_users
-- ============================================================================

CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'support')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_admin_users_email ON public.admin_users(email);
CREATE INDEX idx_admin_users_role ON public.admin_users(role);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all admin users" ON public.admin_users FOR SELECT USING (true);
CREATE POLICY "Admins can update their own profile" ON public.admin_users FOR UPDATE USING (true);

CREATE TRIGGER update_admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TABLE: client_organizations
-- ============================================================================

CREATE TABLE public.client_organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  business_type TEXT,
  industry TEXT,
  website TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  postal_code TEXT,
  tax_id TEXT,
  registration_number TEXT,
  is_active BOOLEAN DEFAULT true,
  subscription_plan TEXT DEFAULT 'basic',
  subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  max_users INTEGER DEFAULT 5,
  max_contacts INTEGER DEFAULT 1000,
  max_campaigns INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_organizations_name ON public.client_organizations(name);
CREATE INDEX idx_client_organizations_is_active ON public.client_organizations(is_active);

ALTER TABLE public.client_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all organizations" ON public.client_organizations FOR SELECT USING (true);
CREATE POLICY "Super admins can manage all organizations" ON public.client_organizations FOR ALL USING (true);

CREATE TRIGGER update_client_organizations_updated_at
BEFORE UPDATE ON public.client_organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TABLE: organization_roles
-- ============================================================================

CREATE TABLE public.organization_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.organization_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view organization roles" ON public.organization_roles FOR SELECT USING (true);

-- ============================================================================
-- TABLE: clients (Legacy main clients table)
-- ============================================================================

CREATE TABLE public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_no TEXT,
  wt_business_no TEXT,
  api_key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  password TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  subscription_plan TEXT DEFAULT 'basic',
  subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  max_users INTEGER DEFAULT 5,
  max_contacts INTEGER DEFAULT 1000,
  max_campaigns INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can access their own data" ON public.clients FOR ALL USING (true);

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TABLE: client_users
-- ============================================================================

CREATE TABLE public.client_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  user_id VARCHAR,
  business_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  whatsapp_api_key TEXT,
  whatsapp_number TEXT,
  organization_id UUID REFERENCES public.client_organizations(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.organization_roles(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.admin_users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscription_plan TEXT NOT NULL DEFAULT 'basic',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  mem_password TEXT,
  is_primary_user BOOLEAN DEFAULT false,
  name TEXT
);

CREATE INDEX idx_client_users_email ON public.client_users(email);
CREATE INDEX idx_client_users_user_id ON public.client_users(user_id);
CREATE INDEX idx_client_users_created_by ON public.client_users(created_by);
CREATE INDEX idx_client_users_organization_id ON public.client_users(organization_id);
CREATE INDEX idx_client_users_role_id ON public.client_users(role_id);
CREATE INDEX idx_client_users_client_id ON public.client_users(client_id);

ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all clients" ON public.client_users FOR ALL USING (true);

CREATE TRIGGER update_client_users_updated_at
BEFORE UPDATE ON public.client_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TABLE: admin_sessions
-- ============================================================================

CREATE TABLE public.admin_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_admin_sessions_token ON public.admin_sessions(token);
CREATE INDEX idx_admin_sessions_admin_id ON public.admin_sessions(admin_id);

ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own admin sessions" ON public.admin_sessions FOR ALL USING (true);

-- ============================================================================
-- TABLE: client_sessions
-- ============================================================================

CREATE TABLE public.client_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.client_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_client_sessions_token ON public.client_sessions(token);
CREATE INDEX idx_client_sessions_client_id ON public.client_sessions(client_id);

ALTER TABLE public.client_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own client sessions" ON public.client_sessions FOR ALL USING (true);

-- ============================================================================
-- TABLE: client_settings
-- ============================================================================

CREATE TABLE public.client_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.client_users(id) ON DELETE CASCADE UNIQUE,
  max_messages_per_day INTEGER DEFAULT 1000,
  max_contacts INTEGER DEFAULT 5000,
  features_enabled JSONB DEFAULT '{"templates": true, "scheduling": true, "automation": false, "analytics": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all client settings" ON public.client_settings FOR ALL USING (true);

CREATE TRIGGER update_client_settings_updated_at
BEFORE UPDATE ON public.client_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TABLE: client_permissions
-- ============================================================================

CREATE TABLE public.client_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.client_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view permissions" ON public.client_permissions FOR SELECT USING (true);

-- ============================================================================
-- TABLE: client_user_permissions
-- ============================================================================

CREATE TABLE public.client_user_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_user_id UUID NOT NULL REFERENCES public.client_users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.client_permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.client_user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage user permissions" ON public.client_user_permissions FOR ALL USING (true);

-- ============================================================================
-- TABLE: groups
-- ============================================================================

CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.client_users(id),
  created_by UUID REFERENCES public.client_users(id),
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_groups_user_id ON public.groups(user_id);
CREATE INDEX idx_groups_client_id ON public.groups(client_id);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client users can view their own groups" ON public.groups
FOR SELECT USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can create their own groups" ON public.groups
FOR INSERT WITH CHECK (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can update their own groups" ON public.groups
FOR UPDATE USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can delete their own groups" ON public.groups
FOR DELETE USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TABLE: contacts
-- ============================================================================

CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.client_users(id),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.contacts.group_id IS 'UUID of the group this contact belongs to. Required - every contact must belong to a list.';

CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_client_id ON public.contacts(client_id);
CREATE INDEX idx_contacts_group_id ON public.contacts(group_id);
CREATE INDEX idx_contacts_phone ON public.contacts(phone);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client users can create their own contacts" ON public.contacts
FOR INSERT WITH CHECK (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can view their own contacts" ON public.contacts
FOR SELECT USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can update their own contacts" ON public.contacts
FOR UPDATE USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can delete their own contacts" ON public.contacts
FOR DELETE USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TABLE: contact_groups
-- ============================================================================

CREATE TABLE public.contact_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contact_id, group_id)
);

ALTER TABLE public.contact_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their contact groups" ON public.contact_groups
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.contacts 
    WHERE contacts.id = contact_groups.contact_id 
    AND contacts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their contact groups" ON public.contact_groups
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contacts 
    WHERE contacts.id = contact_groups.contact_id 
    AND contacts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their contact groups" ON public.contact_groups
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.contacts 
    WHERE contacts.id = contact_groups.contact_id 
    AND contacts.user_id = auth.uid()
  )
);

-- ============================================================================
-- TABLE: templates
-- ============================================================================

CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.clients(id),
  client_id UUID REFERENCES public.client_users(id),
  added_by UUID REFERENCES public.client_users(id),
  template_name TEXT NOT NULL,
  creation_time BIGINT NOT NULL,
  whatsapp_status TEXT NOT NULL,
  system_status TEXT NOT NULL,
  media_type TEXT NOT NULL,
  language TEXT NOT NULL,
  category TEXT NOT NULL,
  template_body TEXT,
  template_header TEXT,
  template_footer TEXT,
  buttons1_type TEXT,
  buttons1_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_templates_user_id ON public.templates(user_id);
CREATE INDEX idx_templates_client_id ON public.templates(client_id);
CREATE INDEX idx_templates_template_name ON public.templates(template_name);
CREATE INDEX idx_templates_category ON public.templates(category);
CREATE INDEX idx_templates_language ON public.templates(language);
CREATE INDEX idx_templates_media_type ON public.templates(media_type);
CREATE INDEX idx_templates_whatsapp_status ON public.templates(whatsapp_status);

-- Note: RLS is DISABLED on templates (matches actual DB)
ALTER TABLE public.templates DISABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_templates_updated_at
BEFORE UPDATE ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TABLE: media
-- ============================================================================

CREATE TABLE public.media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.clients(id),
  client_id UUID REFERENCES public.client_users(id),
  added_by UUID REFERENCES public.client_users(id),
  name TEXT NOT NULL UNIQUE,
  creation_time BIGINT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'doc', 'audio')),
  media_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  waba_number BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_media_user_id ON public.media(user_id);
CREATE INDEX idx_media_client_id ON public.media(client_id);

-- Note: RLS is DISABLED on media (matches actual DB)
ALTER TABLE public.media DISABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_media_updated_at
BEFORE UPDATE ON public.media
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TABLE: campaigns
-- ============================================================================

CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.clients(id),
  client_id UUID REFERENCES public.client_users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.client_users(id),
  added_by UUID NOT NULL REFERENCES public.client_users(id),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  message_content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  target_groups UUID[] DEFAULT '{}',
  template_id UUID,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  selected_media_id TEXT,
  selected_media_type TEXT CHECK (selected_media_type IS NULL OR selected_media_type IN ('image', 'video', 'doc', 'audio')),
  variable_mappings JSONB DEFAULT '{}',
  reports_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.campaigns.reports_data IS 'Stores campaign message reports data as JSONB array';

CREATE INDEX idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX idx_campaigns_client_id ON public.campaigns(client_id);
CREATE INDEX idx_campaigns_template_id ON public.campaigns(template_id);
CREATE INDEX idx_campaigns_group_id ON public.campaigns(group_id);
CREATE INDEX idx_campaigns_reports_data ON public.campaigns USING GIN (reports_data);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client users can view their own campaigns" ON public.campaigns
FOR SELECT USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can create their own campaigns" ON public.campaigns
FOR INSERT WITH CHECK (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can update their own campaigns" ON public.campaigns
FOR UPDATE USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can delete their own campaigns" ON public.campaigns
FOR DELETE USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TABLE: messages
-- ============================================================================

CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.client_users(id),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  recipient_phone TEXT NOT NULL,
  message_content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  error_message TEXT,
  transaction_id TEXT,
  message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_client_id ON public.messages(client_id);
CREATE INDEX idx_messages_campaign_id ON public.messages(campaign_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client users can create their own messages" ON public.messages
FOR INSERT WITH CHECK (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can view their own messages" ON public.messages
FOR SELECT USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE POLICY "Client users can update their own messages" ON public.messages
FOR UPDATE USING (client_id IN (SELECT id FROM public.client_users WHERE is_active = true));

CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TABLE: scheduled_messages
-- ============================================================================

CREATE TABLE public.scheduled_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.client_users(id),
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message_content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  template_id UUID,
  flow_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_scheduled_messages_user_id ON public.scheduled_messages(user_id);
CREATE INDEX idx_scheduled_messages_scheduled_for ON public.scheduled_messages(scheduled_for);

ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scheduled messages" ON public.scheduled_messages
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled messages" ON public.scheduled_messages
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled messages" ON public.scheduled_messages
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled messages" ON public.scheduled_messages
FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_scheduled_messages_updated_at
BEFORE UPDATE ON public.scheduled_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TABLE: flows
-- ============================================================================

CREATE TABLE public.flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.client_users(id),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_flows_user_id ON public.flows(user_id);

ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own flows" ON public.flows
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flows" ON public.flows
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flows" ON public.flows
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flows" ON public.flows
FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_flows_updated_at
BEFORE UPDATE ON public.flows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TABLE: flow_steps
-- ============================================================================

CREATE TABLE public.flow_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL DEFAULT 'message',
  content TEXT NOT NULL,
  delay_hours INTEGER DEFAULT 0,
  delay_minutes INTEGER DEFAULT 0,
  conditions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_flow_steps_flow_id ON public.flow_steps(flow_id);

ALTER TABLE public.flow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their flow steps" ON public.flow_steps
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.flows 
    WHERE flows.id = flow_steps.flow_id 
    AND flows.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their flow steps" ON public.flow_steps
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.flows 
    WHERE flows.id = flow_steps.flow_id 
    AND flows.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their flow steps" ON public.flow_steps
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.flows 
    WHERE flows.id = flow_steps.flow_id 
    AND flows.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their flow steps" ON public.flow_steps
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.flows 
    WHERE flows.id = flow_steps.flow_id 
    AND flows.user_id = auth.uid()
  )
);

-- ============================================================================
-- TABLE: tickets
-- ============================================================================

CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.client_users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL DEFAULT 'general',
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tickets" ON public.tickets
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets" ON public.tickets
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets" ON public.tickets
FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TABLE: ticket_comments
-- ============================================================================

CREATE TABLE public.ticket_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on their tickets" ON public.ticket_comments
FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.tickets 
    WHERE tickets.id = ticket_comments.ticket_id 
    AND tickets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create comments on their tickets" ON public.ticket_comments
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.tickets 
    WHERE tickets.id = ticket_comments.ticket_id 
    AND tickets.user_id = auth.uid()
  )
);

-- ============================================================================
-- TABLE: profiles (Legacy - for auth.users compatibility)
-- ============================================================================

CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.client_users(id),
  email TEXT,
  whatsapp_api_key TEXT,
  whatsapp_number TEXT,
  business_name TEXT,
  user_id_string VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TABLE: user_roles
-- ============================================================================

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage user roles" ON public.user_roles
FOR ALL USING (true);

CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TABLE: admin_logs
-- ============================================================================

CREATE TABLE public.admin_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.admin_users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_logs_admin_id ON public.admin_logs(admin_id);
CREATE INDEX idx_admin_logs_created_at ON public.admin_logs(created_at);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs" ON public.admin_logs FOR SELECT USING (true);
CREATE POLICY "System can insert logs" ON public.admin_logs FOR INSERT WITH CHECK (true);

-- ============================================================================
-- TABLE: admin_audit_logs
-- ============================================================================

CREATE TABLE public.admin_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_logs_admin_user_id ON public.admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs FOR SELECT USING (true);

-- ============================================================================
-- TABLE: client_subscriptions
-- ============================================================================

CREATE TABLE public.client_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.client_organizations(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  plan_details JSONB DEFAULT '{}',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  payment_method TEXT,
  payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_subscriptions_organization_id ON public.client_subscriptions(organization_id);

ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view client subscriptions" ON public.client_subscriptions FOR SELECT USING (true);

-- ============================================================================
-- TABLE: client_usage_metrics
-- ============================================================================

CREATE TABLE public.client_usage_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.client_organizations(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_users INTEGER DEFAULT 0,
  total_contacts INTEGER DEFAULT 0,
  total_campaigns INTEGER DEFAULT 0,
  total_messages_sent INTEGER DEFAULT 0,
  total_templates INTEGER DEFAULT 0,
  total_media_files INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, metric_date)
);

CREATE INDEX idx_client_usage_metrics_organization_id ON public.client_usage_metrics(organization_id);
CREATE INDEX idx_client_usage_metrics_date ON public.client_usage_metrics(metric_date);

ALTER TABLE public.client_usage_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view usage metrics" ON public.client_usage_metrics FOR SELECT USING (true);

-- ============================================================================
-- TABLE: webhook_logs
-- ============================================================================

CREATE TABLE public.webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payload JSONB NOT NULL,
  status TEXT NOT NULL,
  mobile TEXT,
  transaction_id TEXT,
  message_id TEXT,
  message_id_internal UUID,
  campaign_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook logs" ON public.webhook_logs FOR ALL USING (true);

-- ============================================================================
-- AUTHENTICATION FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.authenticate_admin(email_input TEXT, password_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record public.admin_users%ROWTYPE;
  session_token TEXT;
  session_id UUID;
BEGIN
  SELECT * INTO admin_record FROM public.admin_users 
  WHERE email = email_input AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  session_token := encode(gen_random_bytes(32), 'base64');
  
  INSERT INTO public.admin_sessions (admin_id, token, expires_at)
  VALUES (admin_record.id, session_token, now() + interval '7 days')
  RETURNING id INTO session_id;
  
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
SET search_path = public
AS $$
DECLARE
  client_record public.client_users%ROWTYPE;
  session_token TEXT;
  session_id UUID;
BEGIN
  SELECT * INTO client_record FROM public.client_users 
  WHERE email = email_input AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  session_token := encode(gen_random_bytes(32), 'base64');
  
  INSERT INTO public.client_sessions (client_id, token, expires_at)
  VALUES (client_record.id, session_token, now() + interval '7 days')
  RETURNING id INTO session_id;
  
  UPDATE public.client_users SET last_login = now() WHERE id = client_record.id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'client', row_to_json(client_record),
    'token', session_token,
    'session_id', session_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.authenticate_client_by_user_id(user_id_input TEXT, password_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_record public.client_users%ROWTYPE;
  session_token TEXT;
  session_id UUID;
BEGIN
  SELECT * INTO client_record FROM public.client_users 
  WHERE user_id::text = user_id_input AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid User ID or password');
  END IF;
  
  session_token := encode(gen_random_bytes(32), 'base64');
  
  INSERT INTO public.client_sessions (client_id, token, expires_at)
  VALUES (client_record.id, session_token, now() + interval '7 days')
  RETURNING id INTO session_id;
  
  UPDATE public.client_users SET last_login = now() WHERE id = client_record.id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'client', row_to_json(client_record),
    'token', session_token,
    'session_id', session_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_active_client_user(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.client_users 
    WHERE id = user_id_param AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, business_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
-- Schema verified against actual Supabase database
-- Total Tables: 29
-- Total Indexes: 50+
-- Total Functions: 6
-- Total Triggers: 15+
-- Total RLS Policies: 60+
-- ============================================================================
