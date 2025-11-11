-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create tickets table for feedback management
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL DEFAULT 'general',
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket_comments table for ticket conversations
CREATE TABLE public.ticket_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS policies for tickets
CREATE POLICY "Users can view their own tickets" 
ON public.tickets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets" 
ON public.tickets 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own tickets" 
ON public.tickets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets" 
ON public.tickets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all tickets" 
ON public.tickets 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for ticket_comments
CREATE POLICY "Users can view comments on their tickets" 
ON public.ticket_comments 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.tickets 
    WHERE tickets.id = ticket_comments.ticket_id 
    AND tickets.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all comments" 
ON public.ticket_comments 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create comments on their tickets" 
ON public.ticket_comments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.tickets 
    WHERE tickets.id = ticket_comments.ticket_id 
    AND tickets.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can create comments on all tickets" 
ON public.ticket_comments 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update profiles trigger to assign default user role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, business_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business')
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;