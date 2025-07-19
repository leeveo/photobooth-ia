-- Activer la sécurité RLS sur la table
ALTER TABLE photobooth_encadrement ENABLE ROW LEVEL SECURITY;

-- Policy: lecture publique (SELECT) pour tous
CREATE POLICY "Public read access"
  ON photobooth_encadrement
  FOR SELECT
  USING (true);

-- Policy: interdiction d'INSERT, UPDATE, DELETE par défaut
-- (Supabase bloque ces opérations si aucune policy n'est définie)
-- Si besoin d'autoriser l'admin, ajouter une policy spécifique, exemple :
-- CREATE POLICY "Admin full access"
--   ON photobooth_encadrement
--   FOR ALL
--   TO authenticated
--   USING (auth.role() = 'admin');
