-- Drop the table if it exists to ensure a clean start
DROP TABLE IF EXISTS public.admin_accounts;

-- Create the admin_accounts table with proper structure
CREATE TABLE public.admin_accounts (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add a foreign key constraint to auth.users if needed
-- Note: We're removing the ON DELETE CASCADE to troubleshoot potential issues
ALTER TABLE public.admin_accounts 
  ADD CONSTRAINT fk_user_id 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id);

-- Add indexes for better performance
CREATE INDEX idx_admin_accounts_email ON public.admin_accounts(email);

-- Enable Row Level Security
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies with less restrictive conditions for testing
CREATE POLICY "Anyone can insert admin accounts during signup" 
  ON public.admin_accounts 
  FOR INSERT 
  TO authenticated, anon
  WITH CHECK (true);  -- Temporary permissive policy for testing

CREATE POLICY "Users can view any admin account" 
  ON public.admin_accounts 
  FOR SELECT 
  TO authenticated, anon
  USING (true);  -- Temporary permissive policy for testing

-- Grant permissions to the necessary roles
GRANT ALL ON public.admin_accounts TO authenticated;
GRANT ALL ON public.admin_accounts TO anon;
GRANT ALL ON public.admin_accounts TO service_role;

-- Test function to check if table is accessible
CREATE OR REPLACE FUNCTION public.test_admin_accounts_insert()
RETURNS TEXT AS $$
BEGIN
  INSERT INTO public.admin_accounts (id, email, company_name)
  VALUES ('00000000-0000-0000-0000-000000000000', 'test@example.com', 'Test Company')
  ON CONFLICT (id) DO NOTHING;
  
  RETURN 'Success';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;
