-- Permettre l'insertion dans la table backgrounds pour les utilisateurs authentifiés
-- (à adapter selon le niveau de sécurité souhaité)

-- 1. Activer Row Level Security (RLS) si ce n'est pas déjà fait
ALTER TABLE backgrounds ENABLE ROW LEVEL SECURITY;

-- 2. Créer une policy pour l'insertion
CREATE POLICY "Allow insert for authenticated users"
  ON backgrounds
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
  );

-- 3. Créer une policy pour la sélection (lecture)
CREATE POLICY "Allow select for authenticated users"
  ON backgrounds
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
  );

-- 4. (Optionnel) Créer une policy pour la mise à jour
CREATE POLICY "Allow update for authenticated users"
  ON backgrounds
  FOR UPDATE
  USING (
    auth.role() = 'authenticated'
  );

-- 5. (Optionnel) Créer une policy pour la suppression
CREATE POLICY "Allow delete for authenticated users"
  ON backgrounds
  FOR DELETE
  USING (
    auth.role() = 'authenticated'
  );
