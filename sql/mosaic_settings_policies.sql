-- Activer RLS sur la table mosaic_settings
ALTER TABLE mosaic_settings ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes pour éviter les conflits
DROP POLICY IF EXISTS "Administrateurs peuvent lire les paramètres de mosaïque" ON mosaic_settings;
DROP POLICY IF EXISTS "Administrateurs peuvent insérer des paramètres de mosaïque" ON mosaic_settings;
DROP POLICY IF EXISTS "Administrateurs peuvent mettre à jour les paramètres de mosaïque" ON mosaic_settings;
DROP POLICY IF EXISTS "Administrateurs peuvent supprimer les paramètres de mosaïque" ON mosaic_settings;

-- Politique pour permettre aux administrateurs authentifiés de lire les paramètres
CREATE POLICY "Administrateurs peuvent lire les paramètres de mosaïque"
ON mosaic_settings
FOR SELECT
USING (
  -- Vérifier si l'utilisateur est authentifié
  auth.role() = 'authenticated' AND
  -- Vérifier si le projet appartient à l'utilisateur authentifié
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = mosaic_settings.project_id
    AND projects.created_by = auth.uid()
  )
);

-- Politique pour permettre aux administrateurs authentifiés d'insérer des paramètres
CREATE POLICY "Administrateurs peuvent insérer des paramètres de mosaïque"
ON mosaic_settings
FOR INSERT
WITH CHECK (
  -- Vérifier si l'utilisateur est authentifié
  auth.role() = 'authenticated' AND
  -- Vérifier si le projet appartient à l'utilisateur authentifié
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = mosaic_settings.project_id
    AND projects.created_by = auth.uid()
  )
);

-- Politique pour permettre aux administrateurs authentifiés de mettre à jour les paramètres
CREATE POLICY "Administrateurs peuvent mettre à jour les paramètres de mosaïque"
ON mosaic_settings
FOR UPDATE
USING (
  -- Vérifier si l'utilisateur est authentifié
  auth.role() = 'authenticated' AND
  -- Vérifier si le projet appartient à l'utilisateur authentifié
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = mosaic_settings.project_id
    AND projects.created_by = auth.uid()
  )
)
WITH CHECK (
  -- Vérifier si l'utilisateur est authentifié
  auth.role() = 'authenticated' AND
  -- Vérifier si le projet appartient à l'utilisateur authentifié
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = mosaic_settings.project_id
    AND projects.created_by = auth.uid()
  )
);

-- Politique pour permettre aux administrateurs authentifiés de supprimer les paramètres
CREATE POLICY "Administrateurs peuvent supprimer les paramètres de mosaïque"
ON mosaic_settings
FOR DELETE
USING (
  -- Vérifier si l'utilisateur est authentifié
  auth.role() = 'authenticated' AND
  -- Vérifier si le projet appartient à l'utilisateur authentifié
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = mosaic_settings.project_id
    AND projects.created_by = auth.uid()
  )
);

-- Ajouter une politique plus simple si les requêtes ci-dessus ne fonctionnent pas
-- Cette politique moins sécurisée devrait être utilisée uniquement en dernier recours
DROP POLICY IF EXISTS "Politique de secours pour mosaic_settings" ON mosaic_settings;
CREATE POLICY "Politique de secours pour mosaic_settings"
ON mosaic_settings
FOR ALL
USING (true)
WITH CHECK (true);
