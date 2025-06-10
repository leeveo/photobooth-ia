-- Création de la table layout_templates pour stocker les templates indépendants des projets

CREATE TABLE IF NOT EXISTS public.layout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  elements JSONB NOT NULL,
  stage_size JSONB NOT NULL,
  thumbnail_url TEXT,
  category TEXT,
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_layout_templates_category ON public.layout_templates(category);
CREATE INDEX IF NOT EXISTS idx_layout_templates_is_public ON public.layout_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_layout_templates_created_by ON public.layout_templates(created_by);

-- Politique RLS pour la sécurité
ALTER TABLE public.layout_templates ENABLE ROW LEVEL SECURITY;

-- Les administrateurs peuvent tout faire
CREATE POLICY "Admins can do everything with layout templates" ON public.layout_templates
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role')
  WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Les utilisateurs authentifiés peuvent voir les templates publics
CREATE POLICY "Authenticated users can see public templates" ON public.layout_templates
  FOR SELECT
  USING (is_public = true OR auth.uid() = created_by);

-- Les utilisateurs peuvent créer leurs propres templates
CREATE POLICY "Users can create their own templates" ON public.layout_templates
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Les utilisateurs peuvent modifier uniquement leurs propres templates
CREATE POLICY "Users can update their own templates" ON public.layout_templates
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Les utilisateurs peuvent supprimer uniquement leurs propres templates
CREATE POLICY "Users can delete their own templates" ON public.layout_templates
  FOR DELETE
  USING (auth.uid() = created_by);
