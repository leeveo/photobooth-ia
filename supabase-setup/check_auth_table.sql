-- Exécutez cette requête dans l'éditeur SQL de Supabase
SELECT relname as table_name, 
       n_live_tup as row_count
FROM pg_stat_user_tables 
WHERE schemaname = 'auth' 
ORDER BY n_live_tup DESC;

-- Vérifiez la structure de la table auth.users
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'auth' 
AND table_name = 'users';
