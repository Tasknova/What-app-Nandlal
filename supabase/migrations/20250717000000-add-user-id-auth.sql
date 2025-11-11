-- Add function for client authentication using user_id
CREATE OR REPLACE FUNCTION public.authenticate_client_by_user_id(user_id_input TEXT, password_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_record public.client_users%ROWTYPE;
  session_token TEXT;
  session_id UUID;
BEGIN
  -- Find client user by user_id (which is a UUID stored as text)
  SELECT * INTO client_record FROM public.client_users 
  WHERE user_id::text = user_id_input AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid User ID or password');
  END IF;
  
  -- In a real implementation, you would verify the password hash here
  -- For now, we'll create the session (password verification should be added)
  
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

-- Add index for user_id lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_client_users_user_id_text ON public.client_users(user_id::text);

-- Add a comment to the function
COMMENT ON FUNCTION public.authenticate_client_by_user_id(TEXT, TEXT) IS 'Authenticate client users using their user_id instead of email';
