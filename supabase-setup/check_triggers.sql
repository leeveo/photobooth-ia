-- Liste tous les triggers dans la base de données
SELECT event_object_schema as schema_name,
       event_object_table as table_name, 
       trigger_name
FROM information_schema.triggers
ORDER BY schema_name, table_name;

-- Vérifier les fonctions liées à auth
SELECT n.nspname as schema,
       p.proname as function_name,
       pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'auth'
ORDER BY p.proname;
