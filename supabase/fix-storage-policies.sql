-- Vérifier les politiques existantes pour les objets de stockage
SELECT * FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Supprimer les politiques existantes pour le bucket "projects" pour éviter les conflits
DROP POLICY IF EXISTS "Téléchargement public des fichiers projects" ON storage.objects;
DROP POLICY IF EXISTS "Téléversement des fichiers projects par les admins" ON storage.objects;
DROP POLICY IF EXISTS "Mise à jour des fichiers projects par les admins" ON storage.objects;
DROP POLICY IF EXISTS "Suppression des fichiers projects par les admins" ON storage.objects;

-- Créer des politiques plus permissives pour le stockage
-- 1. Permettre à tous les utilisateurs authentifiés de téléverser des fichiers
CREATE POLICY "Tous les utilisateurs authentifiés peuvent téléverser des fichiers projects"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'projects');

-- 2. Permettre à tous les utilisateurs authentifiés de mettre à jour leurs propres fichiers
CREATE POLICY "Tous les utilisateurs authentifiés peuvent mettre à jour leurs fichiers projects"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'projects');

-- 3. Permettre à tous les utilisateurs authentifiés de supprimer leurs propres fichiers
CREATE POLICY "Tous les utilisateurs authentifiés peuvent supprimer leurs fichiers projects"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'projects');

-- 4. Permettre à tous les utilisateurs de voir les fichiers (accès public en lecture)
CREATE POLICY "Accès public en lecture pour les fichiers projects"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'projects');

-- Si nécessaire, vérifier que le bucket existe ou le créer
INSERT INTO storage.buckets (id, name, public)
VALUES ('projects', 'projects', true)
ON CONFLICT (id) DO NOTHING;

-- Exécuter la même chose pour les autres buckets nécessaires

-- Bucket backgrounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('backgrounds', 'backgrounds', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Tous les utilisateurs authentifiés peuvent téléverser des fichiers backgrounds"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'backgrounds');

CREATE POLICY "Accès public en lecture pour les fichiers backgrounds"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'backgrounds');

-- Bucket styles
INSERT INTO storage.buckets (id, name, public)
VALUES ('styles', 'styles', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Tous les utilisateurs authentifiés peuvent téléverser des fichiers styles"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'styles');

CREATE POLICY "Accès public en lecture pour les fichiers styles"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'styles');

-- Bucket settings
INSERT INTO storage.buckets (id, name, public)
VALUES ('settings', 'settings', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Tous les utilisateurs authentifiés peuvent téléverser des fichiers settings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'settings');

CREATE POLICY "Accès public en lecture pour les fichiers settings"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'settings');
