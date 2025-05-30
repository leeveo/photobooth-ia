-- Script pour créer les buckets nécessaires
-- Exécutez ce script dans l'interface SQL de Supabase

-- Création des buckets

-- Bucket pour les projets
INSERT INTO storage.buckets (id, name, public)
VALUES ('projects', 'projects', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour les arrière-plans
INSERT INTO storage.buckets (id, name, public)
VALUES ('backgrounds', 'backgrounds', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour les styles
INSERT INTO storage.buckets (id, name, public)
VALUES ('styles', 'styles', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour les paramètres/settings
INSERT INTO storage.buckets (id, name, public)
VALUES ('settings', 'settings', false)
ON CONFLICT (id) DO NOTHING;

-- Politiques pour le bucket "projects"

-- Lecture publique des fichiers dans le bucket projects
CREATE POLICY "Lecture publique des images de projets"
ON storage.objects FOR SELECT
USING (bucket_id = 'projects');

-- Insertion (upload) uniquement pour les utilisateurs authentifiés qui sont admin
CREATE POLICY "Upload des images de projets par les administrateurs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'projects'
    AND (
        SELECT role FROM public.profiles
        WHERE id = auth.uid()
    ) = 'admin'
);

-- Mise à jour uniquement pour les utilisateurs authentifiés qui sont admin
CREATE POLICY "Mise à jour des images de projets par les administrateurs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'projects'
    AND (
        SELECT role FROM public.profiles
        WHERE id = auth.uid()
    ) = 'admin'
);

-- Suppression uniquement pour les utilisateurs authentifiés qui sont admin
CREATE POLICY "Suppression des images de projets par les administrateurs"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'projects'
    AND (
        SELECT role FROM public.profiles
        WHERE id = auth.uid()
    ) = 'admin'
);

-- Politiques pour le bucket "backgrounds"

-- Lecture publique des arrière-plans
CREATE POLICY "Lecture publique des arrière-plans"
ON storage.objects FOR SELECT
USING (bucket_id = 'backgrounds');

-- Insertion (upload) uniquement pour les utilisateurs authentifiés qui sont admin
CREATE POLICY "Upload des arrière-plans par les administrateurs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'backgrounds'
    AND (
        SELECT role FROM public.profiles
        WHERE id = auth.uid()
    ) = 'admin'
);

-- Mise à jour uniquement pour les utilisateurs authentifiés qui sont admin
CREATE POLICY "Mise à jour des arrière-plans par les administrateurs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'backgrounds'
    AND (
        SELECT role FROM public.profiles
        WHERE id = auth.uid()
    ) = 'admin'
);

-- Suppression uniquement pour les utilisateurs authentifiés qui sont admin
CREATE POLICY "Suppression des arrière-plans par les administrateurs"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'backgrounds'
    AND (
        SELECT role FROM public.profiles
        WHERE id = auth.uid()
    ) = 'admin'
);

-- Politiques pour le bucket "styles"

-- Lecture publique des styles
CREATE POLICY "Lecture publique des styles"
ON storage.objects FOR SELECT
USING (bucket_id = 'styles');

-- Insertion (upload) uniquement pour les utilisateurs authentifiés qui sont admin
CREATE POLICY "Upload des styles par les administrateurs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'styles'
    AND (
        SELECT role FROM public.profiles
        WHERE id = auth.uid()
    ) = 'admin'
);

-- Mise à jour uniquement pour les utilisateurs authentifiés qui sont admin
CREATE POLICY "Mise à jour des styles par les administrateurs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'styles'
    AND (
        SELECT role FROM public.profiles
        WHERE id = auth.uid()
    ) = 'admin'
);

-- Suppression uniquement pour les utilisateurs authentifiés qui sont admin
CREATE POLICY "Suppression des styles par les administrateurs"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'styles'
    AND (
        SELECT role FROM public.profiles
        WHERE id = auth.uid()
    ) = 'admin'
);

-- Politiques pour le bucket "settings"

-- Lecture publique des settings
CREATE POLICY "Lecture publique des settings"
ON storage.objects FOR SELECT
USING (bucket_id = 'settings');

-- Insertion (upload) uniquement pour les utilisateurs authentifiés qui sont admin
CREATE POLICY "Upload des settings par les administrateurs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'settings'
    AND (
        SELECT role FROM public.profiles
        WHERE id = auth.uid()
    ) = 'admin'
);

-- Mise à jour uniquement pour les utilisateurs authentifiés qui sont admin
CREATE POLICY "Mise à jour des settings par les administrateurs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'settings'
    AND (
        SELECT role FROM public.profiles
        WHERE id = auth.uid()
    ) = 'admin'
);

-- Suppression uniquement pour les utilisateurs authentifiés qui sont admin
CREATE POLICY "Suppression des settings par les administrateurs"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'settings'
    AND (
        SELECT role FROM public.profiles
        WHERE id = auth.uid()
    ) = 'admin'
);
