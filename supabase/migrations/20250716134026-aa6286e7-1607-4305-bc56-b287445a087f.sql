-- Create templates table for message templates
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  variables JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contacts table for customer management
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create groups table for contact segmentation
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact_groups junction table
CREATE TABLE public.contact_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL,
  group_id UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contact_id, group_id)
);

-- Create flows table for automated message sequences
CREATE TABLE public.flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create flow_steps table for individual steps in flows
CREATE TABLE public.flow_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL DEFAULT 'message',
  content TEXT NOT NULL,
  delay_hours INTEGER DEFAULT 0,
  delay_minutes INTEGER DEFAULT 0,
  conditions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scheduled_messages table for scheduled messaging
CREATE TABLE public.scheduled_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
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

-- Create campaigns table for bulk messaging campaigns
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  message_content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  target_groups UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.contact_groups
ADD CONSTRAINT contact_groups_contact_id_fkey 
FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

ALTER TABLE public.contact_groups
ADD CONSTRAINT contact_groups_group_id_fkey 
FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE public.flow_steps
ADD CONSTRAINT flow_steps_flow_id_fkey 
FOREIGN KEY (flow_id) REFERENCES public.flows(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_templates_user_id ON public.templates(user_id);
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_phone ON public.contacts(phone);
CREATE INDEX idx_groups_user_id ON public.groups(user_id);
CREATE INDEX idx_flows_user_id ON public.flows(user_id);
CREATE INDEX idx_flow_steps_flow_id ON public.flow_steps(flow_id);
CREATE INDEX idx_scheduled_messages_user_id ON public.scheduled_messages(user_id);
CREATE INDEX idx_scheduled_messages_scheduled_for ON public.scheduled_messages(scheduled_for);
CREATE INDEX idx_campaigns_user_id ON public.campaigns(user_id);

-- Enable RLS on all tables
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for templates
CREATE POLICY "Users can view their own templates" ON public.templates
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates" ON public.templates
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON public.templates
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON public.templates
FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for contacts
CREATE POLICY "Users can view their own contacts" ON public.contacts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contacts" ON public.contacts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" ON public.contacts
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" ON public.contacts
FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for groups
CREATE POLICY "Users can view their own groups" ON public.groups
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own groups" ON public.groups
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own groups" ON public.groups
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own groups" ON public.groups
FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for contact_groups
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

-- Create RLS policies for flows
CREATE POLICY "Users can view their own flows" ON public.flows
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flows" ON public.flows
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flows" ON public.flows
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flows" ON public.flows
FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for flow_steps
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

-- Create RLS policies for scheduled_messages
CREATE POLICY "Users can view their own scheduled messages" ON public.scheduled_messages
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled messages" ON public.scheduled_messages
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled messages" ON public.scheduled_messages
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled messages" ON public.scheduled_messages
FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for campaigns
CREATE POLICY "Users can view their own campaigns" ON public.campaigns
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaigns" ON public.campaigns
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" ON public.campaigns
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" ON public.campaigns
FOR DELETE USING (auth.uid() = user_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_templates_updated_at
BEFORE UPDATE ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_flows_updated_at
BEFORE UPDATE ON public.flows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_messages_updated_at
BEFORE UPDATE ON public.scheduled_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();