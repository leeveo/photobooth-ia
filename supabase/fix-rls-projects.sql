-- Vérification de l'utilisateur actuel et de son rôle
SELECT 
  auth.uid() as current_user_id,
  (SELECT role FROM public.profiles WHERE id = auth.uid()) as current_user_role;

-- Vérification des politiques existantes pour la table projects
SELECT * FROM pg_policies WHERE tablename = 'projects';

-- Suppression des politiques existantes pour la table projects si nécessaire
DROP POLICY IF EXISTS "Les administrateurs peuvent tout faire avec les projets" ON public.projects;
DROP POLICY IF EXISTS "Tout le monde peut voir les projets actifs" ON public.projects;

-- Création de nouvelles politiques avec une approche plus permissive pour les tests
-- Politique permettant aux utilisateurs authentifiés de créer des projets
CREATE POLICY "Les utilisateurs authentifiés peuvent créer des projets" 
ON public.projects 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Politique permettant aux administrateurs de modifier et supprimer des projets
CREATE POLICY "Les administrateurs peuvent modifier et supprimer des projets" 
ON public.projects 
FOR UPDATE 
TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Politique permettant aux administrateurs de supprimer des projets
CREATE POLICY "Les administrateurs peuvent supprimer des projets" 
ON public.projects 
FOR DELETE 
TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Politique permettant à tout le monde de voir les projets actifs
CREATE POLICY "Tout le monde peut voir les projets actifs" 
ON public.projects 
FOR SELECT 
USING (is_active = true);
