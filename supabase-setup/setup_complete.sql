-- Script d'installation complet pour configurer Supabase correctement

-- PARTIE 1: Diagnostic de l'environnement
SELECT version() as postgres_version;
SELECT current_user;
SELECT current_database();

-- PARTIE 2: Configuration du schéma public
CREATE SCHEMA IF NOT EXISTS public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- PARTIE 3: Table d'administration autonome (n'utilise pas auth.users)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS public.admin_users CASCADE;
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  company_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- PARTIE 4: Fonctions d'authentification alternatives
CREATE OR REPLACE FUNCTION public.register_admin(
  admin_email TEXT,
  admin_password TEXT,
  admin_company TEXT
) RETURNS JSONB AS $$
DECLARE
  new_id UUID;
  result JSONB;
BEGIN
  -- Vérifier si l'email existe déjà
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE email = admin_email) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Cet email est déjà utilisé'
    );
  END IF;

  -- Insérer le nouvel administrateur
  INSERT INTO public.admin_users (email, password_hash, company_name)
  VALUES (
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    admin_company
  )
  RETURNING id INTO new_id;

  -- Retourner succès
  RETURN jsonb_build_object(
    'success', true,
    'user_id', new_id,
    'message', 'Compte administrateur créé avec succès'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Erreur: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.login_admin(
  admin_email TEXT,
  admin_password TEXT
) RETURNS JSONB AS $$
DECLARE
  found_user public.admin_users;
  result JSONB;
BEGIN
  -- Rechercher l'utilisateur
  SELECT * INTO found_user
  FROM public.admin_users
  WHERE email = admin_email AND is_active = TRUE;
  
  -- Vérifier si l'utilisateur existe
  IF found_user.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Utilisateur non trouvé'
    );
  END IF;
  
  -- Vérifier le mot de passe
  IF found_user.password_hash = crypt(admin_password, found_user.password_hash) THEN
    -- Mettre à jour la date de dernière connexion
    UPDATE public.admin_users
    SET last_login = NOW()
    WHERE id = found_user.id;
    
    -- Retourner succès avec les données utilisateur
    RETURN jsonb_build_object(
      'success', true,
      'user_id', found_user.id,
      'email', found_user.email,
      'company_name', found_user.company_name,
      'message', 'Connexion réussie'
    );
  ELSE
    -- Mot de passe incorrect
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Mot de passe incorrect'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Erreur: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PARTIE 5: Sécurisation et permissions
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all admin users" 
  ON public.admin_users FOR SELECT 
  USING (true);

CREATE POLICY "Admins can only update their own record" 
  ON public.admin_users FOR UPDATE 
  USING (id = (SELECT id FROM public.admin_users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'));

-- PARTIE 6: Octroyer les permissions d'exécution
GRANT EXECUTE ON FUNCTION public.register_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.login_admin TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.admin_users TO anon, authenticated, service_role;

-- PARTIE 7: Créer un utilisateur admin par défaut (à des fins de test)
SELECT public.register_admin(
  'admin@photoboothia.com',
  'admin123',  -- Changer ce mot de passe en production!
  'PhotoBooth IA'
);
