-- Script SQL pour diagnostiquer les problèmes d'authentification Supabase
-- À exécuter dans Supabase Dashboard > SQL Editor

-- 1. Vérifier l'état de la table auth.users
SELECT 
    tablename, 
    schemaname, 
    hasindexes, 
    hasrules, 
    hastriggers 
FROM pg_tables 
WHERE schemaname = 'auth' AND tablename = 'users';

-- 2. Vérifier les politiques RLS sur auth.users
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'auth' AND tablename = 'users';

-- 3. Vérifier si RLS est activé sur auth.users
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'auth' AND tablename = 'users';

-- 4. Vérifier les paramètres d'authentification
SELECT key, value 
FROM auth.config 
WHERE key IN (
    'site_url',
    'external_google_enabled',
    'external_google_client_id',
    'disable_signup',
    'enable_signup'
);

-- 5. Si des erreurs persistent, temporairement désactiver RLS pour debug
-- ATTENTION: Ne pas utiliser en production !
-- ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- 6. Vérifier les derniers logs d'authentification
-- (Cette requête peut ne pas fonctionner selon votre plan Supabase)
-- SELECT * FROM auth.audit_log_entries 
-- WHERE created_at > NOW() - INTERVAL '1 hour'
-- ORDER BY created_at DESC 
-- LIMIT 10;