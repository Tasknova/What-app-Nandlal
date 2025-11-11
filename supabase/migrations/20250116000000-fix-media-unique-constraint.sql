-- Fix media table unique constraint to allow same names for different users
-- Drop the existing unique constraint on name
ALTER TABLE public.media DROP CONSTRAINT IF EXISTS media_name_key;

-- Create a composite unique constraint on (name, user_id) instead
-- This allows the same media name for different users
ALTER TABLE public.media ADD CONSTRAINT media_name_user_id_key UNIQUE (name, user_id);

-- Add an index for better performance on the composite key
CREATE INDEX IF NOT EXISTS idx_media_name_user_id ON public.media(name, user_id);
