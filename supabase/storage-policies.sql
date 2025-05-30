-- Scripts pour configurer les politiques de sécurité des buckets
-- Exécutez ce script dans l'interface SQL de Supabase

-- Bucket "projects" - Politiques
-- Politique pour permettre à tout le monde de télécharger les fichiers
CREATE POLICY "Téléchargement public des fichiers projects" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'projects');

-- Politique pour permettre uniquement aux administrateurs de téléverser des fichiers
CREATE POLICY "Téléversement des fichiers projects par les admins" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'projects' 
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Politique pour permettre uniquement aux administrateurs de mettre à jour des fichiers
CREATE POLICY "Mise à jour des fichiers projects par les admins" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'projects' 
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Politique pour permettre uniquement aux administrateurs de supprimer des fichiers
CREATE POLICY "Suppression des fichiers projects par les admins" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'projects' 
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Bucket "backgrounds" - Politiques similaires
CREATE POLICY "Téléchargement public des backgrounds" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'backgrounds');

CREATE POLICY "Téléversement des backgrounds par les admins" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'backgrounds' 
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Mise à jour des backgrounds par les admins" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'backgrounds' 
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Suppression des backgrounds par les admins" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'backgrounds' 
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Configurations similaires pour les buckets "styles" et "settings"...
