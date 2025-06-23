-- Activer RLS (Row Level Security) sur la table photos
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Policy 1: Les administrateurs peuvent voir toutes les photos des projets qu'ils ont créés
CREATE POLICY "Admins can view their project photos" ON public.photos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = photos.project_id
    AND projects.created_by = auth.uid()
  )
);

-- Policy 2: Les utilisateurs peuvent voir les photos de leurs propres sessions
-- Modifié pour utiliser user_email au lieu de user_id
CREATE POLICY "Users can view their session photos" ON public.photos
FOR SELECT
USING (
  (session_id IN (
    SELECT id FROM public.sessions
    WHERE user_email = auth.email()
  ))
  OR
  (user_email = auth.email())
);

-- Policy 3: Les utilisateurs peuvent ajouter des photos à leurs sessions
-- Modifié pour utiliser user_email au lieu de user_id
CREATE POLICY "Users can insert their photos" ON public.photos
FOR INSERT
WITH CHECK (
  (session_id IN (
    SELECT id FROM public.sessions
    WHERE user_email = auth.email()
  ))
  OR
  (user_email = auth.email())
);

-- Policy 4: Les administrateurs peuvent modérer (mettre à jour) les photos de leurs projets
CREATE POLICY "Admins can moderate project photos" ON public.photos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = photos.project_id
    AND projects.created_by = auth.uid()
  )
);

-- Policy 5: Les utilisateurs peuvent supprimer leurs propres photos non payées
-- Modifié pour utiliser user_email au lieu de user_id
CREATE POLICY "Users can delete their unpaid photos" ON public.photos
FOR DELETE
USING (
  ((session_id IN (
    SELECT id FROM public.sessions
    WHERE user_email = auth.email()
  ))
  OR
  (user_email = auth.email()))
  AND
  (is_paid = false)
);

-- Policy 6: Les administrateurs peuvent supprimer les photos de leurs projets
CREATE POLICY "Admins can delete project photos" ON public.photos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = photos.project_id
    AND projects.created_by = auth.uid()
  )
);

-- Policy 7: Autoriser le service backend à accéder à toutes les photos (pour les API serverless)
CREATE POLICY "Service role can access all photos" ON public.photos
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Policy 8: Les utilisateurs anonymes peuvent voir toutes les photos non modérées
-- Modifié pour supprimer la référence à projects.is_public qui n'existe pas
CREATE POLICY "Anon users can view unmoderated photos" ON public.photos
FOR SELECT
USING (
  is_moderated = false
);
