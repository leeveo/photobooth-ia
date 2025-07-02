-- 1. Activer RLS sur la table
ALTER TABLE public.photobooth_orientation ENABLE ROW LEVEL SECURITY;

-- 2. Policy de lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Allow read for authenticated"
  ON public.photobooth_orientation
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 3. Policy de lecture pour tous
CREATE POLICY "Allow read for all"
  ON public.photobooth_orientation
  FOR SELECT
  USING (true);

-- 4. (Optionnel) Policy d'insertion pour les utilisateurs authentifiés
CREATE POLICY "Allow insert for authenticated"
  ON public.photobooth_orientation
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 5. (Optionnel) Policy de mise à jour pour les utilisateurs authentifiés
CREATE POLICY "Allow update for authenticated"
  ON public.photobooth_orientation
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 6. (Optionnel) Policy de suppression pour les utilisateurs authentifiés
CREATE POLICY "Allow delete for authenticated"
  ON public.photobooth_orientation
  FOR DELETE
  USING (auth.role() = 'authenticated');
