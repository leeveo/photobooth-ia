-- Create the styles bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('styles', 'styles', true)
ON CONFLICT (id) DO NOTHING;

-- Reset policies for the styles table
DROP POLICY IF EXISTS "Les administrateurs peuvent tout faire avec les styles" ON public.styles;
DROP POLICY IF EXISTS "Tout le monde peut voir les styles actifs" ON public.styles;

-- Allow authenticated users to insert styles
CREATE POLICY "Authenticated users can insert styles"
ON public.styles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update their own styles
CREATE POLICY "Authenticated users can update their styles"
ON public.styles
FOR UPDATE
TO authenticated
USING (true);

-- Allow everyone to view active styles
CREATE POLICY "Everyone can view active styles"
ON public.styles
FOR SELECT
USING (is_active = true);

-- Reset policies for the storage.objects
DROP POLICY IF EXISTS "Tous les utilisateurs authentifiés peuvent téléverser des fichiers styles" ON storage.objects;

-- Allow any authenticated user to upload to the styles bucket
CREATE POLICY "Authenticated users can upload to styles bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'styles');

-- Allow public to view objects in styles bucket
CREATE POLICY "Public can view styles objects"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'styles');
