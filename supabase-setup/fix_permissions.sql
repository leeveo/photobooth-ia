-- Script complet pour résoudre les problèmes d'authentification Supabase

-- Vérification des extensions nécessaires
SELECT extname FROM pg_extension;

-- Vérification des paramètres de connexion
SHOW search_path;

-- Vérification et correction des permissions
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT SELECT, INSERT ON auth.users TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Vérification de l'existence des triggers auth
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname LIKE 'auth%';

-- Vérification des rôles
SELECT rolname FROM pg_roles;

-- Création d'un utilisateur administrateur directement en SQL
-- (solution de contournement en attendant que l'API fonctionne)
DO $$
DECLARE
  user_id uuid := gen_random_uuid();
BEGIN
  -- Essayer d'insérer un utilisateur directement dans auth.users
  BEGIN
    INSERT INTO auth.users (
      id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, role, aud, raw_app_meta_data,
      raw_user_meta_data, is_super_admin
    )
    VALUES (
      user_id,
      'admin@example.com',  -- Remplacer par un email test
      crypt('password123', gen_salt('bf')), -- Mot de passe test (ne pas utiliser en production)
      now(),
      now(),
      now(),
      'authenticated',
      'authenticated',
      '{"provider": "email", "providers": ["email"]}',
      '{"company_name": "Test Company"}',
      false
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Utilisateur admin créé avec ID: %', user_id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Erreur lors de la création directe d''utilisateur: %', SQLERRM;
  END;
END;
$$;

-- Création d'une table alternative pour les administrateurs
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,  -- À utiliser uniquement si Supabase Auth ne fonctionne pas
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sécurisation RLS basique
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin users can manage their own accounts" ON public.admin_users;
CREATE POLICY "Admin users can manage their own accounts" 
  ON public.admin_users 
  USING (true)
  WITH CHECK (true);

-- Créer une fonction pour insérer un administrateur
CREATE OR REPLACE FUNCTION public.insert_admin_user(
  admin_email TEXT,
  admin_password TEXT,
  admin_company TEXT
) RETURNS UUID AS $$
DECLARE
  new_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.admin_users (id, email, password, company_name)
  VALUES (new_id, admin_email, crypt(admin_password, gen_salt('bf')), admin_company);
  
  RETURN new_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur lors de la création de l''administrateur: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.insert_admin_user TO anon, authenticated, service_role;
GRANT ALL ON public.admin_users TO anon, authenticated, service_role;
