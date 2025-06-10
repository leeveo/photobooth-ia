-- Fonction pour désactiver temporairement RLS pendant les tests
CREATE OR REPLACE FUNCTION disable_rls_for_test()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Cette fonction nécessite des privilèges élevés, donc elle s'exécute avec SECURITY DEFINER
  ALTER TABLE canvas_layouts DISABLE ROW LEVEL SECURITY;
  
  -- Réactiver RLS après 5 minutes par sécurité
  PERFORM pg_sleep(300);
  ALTER TABLE canvas_layouts ENABLE ROW LEVEL SECURITY;
END;
$$;

-- Ajouter des droits pour exécuter cette fonction
GRANT EXECUTE ON FUNCTION disable_rls_for_test TO service_role;
