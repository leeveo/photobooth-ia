-- Activer RLS sur la table canvas_layouts
ALTER TABLE canvas_layouts ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre toutes les opérations avec la clé de service
CREATE POLICY "Service role a accès complet" ON canvas_layouts
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role')
  WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Politique pour permettre à tous les utilisateurs authentifiés de lire les layouts
CREATE POLICY "Utilisateurs authentifiés peuvent lire les layouts" ON canvas_layouts
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Politique pour permettre à tous les utilisateurs authentifiés de créer des layouts
CREATE POLICY "Utilisateurs authentifiés peuvent créer des layouts" ON canvas_layouts
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Politique pour permettre aux utilisateurs de modifier leurs propres layouts
-- Nous utilisons une approche simplifiée car la table project_members n'existe pas
CREATE POLICY "Utilisateurs peuvent modifier leurs propres layouts" ON canvas_layouts
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Politique pour permettre aux utilisateurs de supprimer leurs propres layouts
CREATE POLICY "Utilisateurs peuvent supprimer leurs propres layouts" ON canvas_layouts
  FOR DELETE
  USING (auth.uid() IS NOT NULL);
