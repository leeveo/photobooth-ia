-- Add columns for tracking both URLs
ALTER TABLE public.styles 
ADD COLUMN IF NOT EXISTS supabase_url TEXT,
ADD COLUMN IF NOT EXISTS s3_url TEXT;
