-- Admin System Migration
-- This migration creates the admin system with client management and user roles

-- Create admin_users table for admin authentication
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'support')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_organizations table for managing client companies
CREATE TABLE IF NOT EXISTS public.client_organizations (
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

-- Add organization_id to client_users table
ALTER TABLE public.client_users 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.client_organizations(id) ON DELETE CASCADE;

-- Create user_roles table for managing user permissions within organizations
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default user roles
INSERT INTO public.user_roles (name, description, permissions) VALUES
('Owner', 'Full access to all features', '{"all": true}'),
('Admin', 'Administrative access with user management', '{"users": true, "templates": true, "media": true, "campaigns": true, "contacts": true, "messages": true, "analytics": true}'),
('Manager', 'Campaign and content management', '{"templates": true, "media": true, "campaigns": true, "contacts": true, "messages": true, "analytics": true}'),
('Operator', 'Basic campaign operations', '{"campaigns": true, "contacts": true, "messages": true}'),
('Viewer', 'Read-only access to campaigns and analytics', '{"campaigns": {"read": true}, "analytics": {"read": true}}')
ON CONFLICT (name) DO NOTHING;

-- Add role_id to client_users table
ALTER TABLE public.client_users 
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.user_roles(id) ON DELETE SET NULL;

-- Create admin_audit_logs table for tracking admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
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

-- Create client_subscriptions table for tracking subscription history
CREATE TABLE IF NOT EXISTS public.client_subscriptions (
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

-- Create client_usage_metrics table for tracking usage
CREATE TABLE IF NOT EXISTS public.client_usage_metrics (
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);
CREATE INDEX IF NOT EXISTS idx_client_organizations_name ON public.client_organizations(name);
CREATE INDEX IF NOT EXISTS idx_client_organizations_is_active ON public.client_organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_client_users_organization_id ON public.client_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_users_role_id ON public.client_users(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id ON public.admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_organization_id ON public.client_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_usage_metrics_organization_id ON public.client_usage_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_usage_metrics_date ON public.client_usage_metrics(metric_date);

-- Enable RLS on new tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_usage_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_users (only super admins can manage other admins)
CREATE POLICY "Super admins can manage all admin users" ON public.admin_users
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE id = auth.uid() AND role = 'super_admin'
    )
);

-- Create RLS policies for client_organizations (admins can view all, super admins can manage all)
CREATE POLICY "Admins can view all organizations" ON public.client_organizations
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
);

CREATE POLICY "Super admins can manage all organizations" ON public.client_organizations
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE id = auth.uid() AND role = 'super_admin'
    )
);

-- Create RLS policies for user_roles (read-only for admins)
CREATE POLICY "Admins can view user roles" ON public.user_roles
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
);

-- Create RLS policies for admin_audit_logs (admins can view their own logs, super admins can view all)
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
);

-- Create RLS policies for client_subscriptions (admins can view all)
CREATE POLICY "Admins can view client subscriptions" ON public.client_subscriptions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
);

-- Create RLS policies for client_usage_metrics (admins can view all)
CREATE POLICY "Admins can view usage metrics" ON public.client_usage_metrics
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
);

-- Insert default super admin user (password: admin123)
INSERT INTO public.admin_users (email, password_hash, full_name, role) VALUES
('admin@messageblast.com', '$2a$10$rQZ8K9L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2Q3R4S5T6U7V8W9X0Y1Z2A3B4C5D6E7F8G9H0I1J2K3L4M5N6O7P8Q9R0S1T2U3V4W5X6Y7Z8A9B0C1D2E3F4G5H6I7J8K9L0M1N2O3P4Q5R6S7T8U9V0W1X2Y3Z', 'Super Administrator', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_organizations_updated_at BEFORE UPDATE ON public.client_organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
