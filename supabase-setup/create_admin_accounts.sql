-- Créer la table admin_accounts si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.admin_accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter des politiques RLS (Row Level Security)
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;

-- Politique permettant aux utilisateurs authentifiés de voir leurs propres données
CREATE POLICY "Users can view own account" 
  ON public.admin_accounts 
  FOR SELECT 
  USING (auth.uid() = id);

-- Politique permettant aux utilisateurs authentifiés de modifier leurs propres données
CREATE POLICY "Users can update own account" 
  ON public.admin_accounts 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Politique permettant l'insertion lors de l'inscription
CREATE POLICY "Users can insert their own account" 
  ON public.admin_accounts 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);
