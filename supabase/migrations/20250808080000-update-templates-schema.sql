-- Update templates table schema to match WhatsApp API response
-- This migration adds the missing fields needed for WhatsApp templates

-- First, backup existing data if any
CREATE TABLE IF NOT EXISTS public.templates_backup AS 
SELECT * FROM public.templates;

-- Drop the existing templates table
DROP TABLE IF EXISTS public.templates CASCADE;

-- Create new templates table with WhatsApp API fields
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.client_users(id),
  template_name TEXT NOT NULL,
  creation_time BIGINT NOT NULL,
  whatsapp_status TEXT NOT NULL DEFAULT 'enabled',
  system_status TEXT NOT NULL DEFAULT 'enabled',
  media_type TEXT NOT NULL DEFAULT 'text',
  language TEXT NOT NULL DEFAULT 'en',
  category TEXT NOT NULL DEFAULT 'MARKETING',
  template_body TEXT,
  template_header TEXT,
  template_footer TEXT,
  buttons1_type TEXT,
  buttons1_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_templates_user_id ON public.templates(user_id);
CREATE INDEX idx_templates_client_id ON public.templates(client_id);
CREATE INDEX idx_templates_template_name ON public.templates(template_name);
CREATE INDEX idx_templates_category ON public.templates(category);
CREATE INDEX idx_templates_language ON public.templates(language);
CREATE INDEX idx_templates_media_type ON public.templates(media_type);
CREATE INDEX idx_templates_whatsapp_status ON public.templates(whatsapp_status);

-- Enable RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for templates
CREATE POLICY "Users can view their own templates" ON public.templates
FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own templates" ON public.templates
FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own templates" ON public.templates
FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own templates" ON public.templates
FOR DELETE USING (auth.uid()::text = user_id::text);

-- Create trigger for updated_at
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment to the table
COMMENT ON TABLE public.templates IS 'WhatsApp message templates from theultimate.io API';
