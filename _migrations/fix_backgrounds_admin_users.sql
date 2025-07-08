-- 1. Supprimer la contrainte FK existante
ALTER TABLE backgrounds
DROP CONSTRAINT IF EXISTS backgrounds_created_by_fkey;

-- 2. Ajouter la nouvelle contrainte FK vers admin_users
ALTER TABLE backgrounds
ADD CONSTRAINT backgrounds_created_by_fkey
FOREIGN KEY (created_by) REFERENCES admin_users(id);

-- 3. Policy RLS pour autoriser l'INSERT si created_by existe dans admin_users
CREATE POLICY "Allow insert if created_by exists in admin_users"
ON backgrounds
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users WHERE admin_users.id = backgrounds.created_by
  )
);
