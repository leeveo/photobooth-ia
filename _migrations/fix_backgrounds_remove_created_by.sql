-- Supprimer toutes les policies RLS dépendantes de created_by
DROP POLICY IF EXISTS "Allow select if created_by exists in admin_users" ON backgrounds;
DROP POLICY IF EXISTS "Allow update if created_by exists in admin_users" ON backgrounds;
DROP POLICY IF EXISTS "Allow delete if created_by exists in admin_users" ON backgrounds;
DROP POLICY IF EXISTS "Allow insert if created_by exists in admin_users" ON backgrounds;

-- Supprimer la contrainte de clé étrangère si elle existe
ALTER TABLE backgrounds DROP CONSTRAINT IF EXISTS backgrounds_created_by_fkey;

-- Supprimer la colonne created_by
ALTER TABLE backgrounds DROP COLUMN IF EXISTS created_by;

-- Exemple : autoriser l'accès si le project_id existe dans la table projects
CREATE POLICY "Allow all for valid project"
ON backgrounds
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects WHERE projects.id = backgrounds.project_id
  )
);
