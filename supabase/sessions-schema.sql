-- Create a minimal sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  session_data JSONB,
  project_id UUID REFERENCES public.projects(id)
);

-- Add RLS policies to allow anonymous inserts but restrict other operations
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous session insert" ON public.sessions
  FOR INSERT WITH CHECK (true);
  
CREATE POLICY "Allow authenticated users to view sessions" ON public.sessions
  FOR SELECT USING (auth.role() = 'authenticated');
