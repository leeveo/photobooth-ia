-- Script pour tester manuellement le flux d'authentification

-- 1. Créer un utilisateur de test
DO $$
DECLARE
  result JSONB;
BEGIN
  SELECT public.register_admin(
    'test@example.com',
    'password123',
    'Test Company'
  ) INTO result;
  
  RAISE NOTICE 'Résultat de l''inscription: %', result;
END;
$$;

-- 2. Vérifier que l'utilisateur a bien été créé
SELECT id, email, company_name, is_active FROM public.admin_users WHERE email = 'test@example.com';

-- 3. Tester la connexion avec les mêmes identifiants
DO $$
DECLARE
  result JSONB;
BEGIN
  SELECT public.login_admin(
    'test@example.com',
    'password123'
  ) INTO result;
  
  RAISE NOTICE 'Résultat de la connexion: %', result;
END;
$$;

-- 4. Tester la connexion avec un mauvais mot de passe
DO $$
DECLARE
  result JSONB;
BEGIN
  SELECT public.login_admin(
    'test@example.com',
    'mauvais_mot_de_passe'
  ) INTO result;
  
  RAISE NOTICE 'Résultat de la connexion avec mauvais mot de passe: %', result;
END;
$$;
