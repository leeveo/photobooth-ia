-- Check if auth schema is functioning properly

-- Check if the auth schema exists
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'auth';

-- Check which tables exist in the auth schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'auth' 
ORDER BY table_name;

-- Check if the auth.users table is accessible
SELECT 
  'Number of users'::text as description,
  COUNT(*)::text as result 
FROM auth.users;

-- Test if the current role has permission to access auth functions
DO $$
BEGIN
  -- Try to access auth.uid() function
  BEGIN
    PERFORM auth.uid();
    RAISE NOTICE 'auth.uid() is accessible';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error accessing auth.uid(): %', SQLERRM;
  END;
END;
$$;

-- Check permissions on auth.users table
SELECT 
  grantee, 
  table_schema, 
  table_name, 
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'auth' AND table_name = 'users';
