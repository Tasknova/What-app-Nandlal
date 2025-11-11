-- Create dummy admin user
INSERT INTO public.admin_users (email, password_hash, full_name)
VALUES ('admin@example.com', 'admin123', 'Admin User');

-- Create dummy client user (using the admin user as creator)
INSERT INTO public.client_users (
  email, 
  password_hash, 
  business_name, 
  phone_number, 
  whatsapp_api_key, 
  whatsapp_number,
  created_by
)
VALUES (
  'nandlal@example.com',
  'client123',
  'Nandlal Jewellers',
  '9822040676',
  '6c690e3ce94a97dd3bc5349d215f293bae88963c',
  '9822040676',
  (SELECT id FROM public.admin_users WHERE email = 'admin@example.com')
);