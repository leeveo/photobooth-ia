-- Script pour déboguer la fonction de connexion

-- Version améliorée de la fonction login_admin avec plus de logs
CREATE OR REPLACE FUNCTION public.login_admin(
  admin_email TEXT,
  admin_password TEXT
) RETURNS JSONB AS $$
DECLARE
  found_user public.admin_users;
  result JSONB;
  debug_info JSONB;
BEGIN
  -- Collecter des informations de débogage
  debug_info := jsonb_build_object(
    'email_provided', admin_email,
    'password_length', length(admin_password)
  );
  
  -- Rechercher l'utilisateur
  SELECT * INTO found_user
  FROM public.admin_users
  WHERE email = admin_email;
  
  -- Vérifier si l'utilisateur existe
  IF found_user.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Utilisateur non trouvé',
      'debug', debug_info
    );
  END IF;

  -- Ajouter des informations de débogage sur l'utilisateur trouvé
  debug_info := debug_info || jsonb_build_object(
    'user_found', true,
    'user_id', found_user.id,
    'is_active', found_user.is_active,
    'has_password', found_user.password_hash IS NOT NULL
  );
  
  -- Vérifier si l'utilisateur est actif
  IF NOT found_user.is_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Compte désactivé',
      'debug', debug_info
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
      'message', 'Connexion réussie',
      'debug', debug_info || jsonb_build_object('password_match', true)
    );
  ELSE
    -- Mot de passe incorrect
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Mot de passe incorrect',
      'debug', debug_info || jsonb_build_object('password_match', false)
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Erreur: ' || SQLERRM,
      'debug', debug_info
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Requête pour tester la fonction directement
SELECT * FROM public.admin_users;
