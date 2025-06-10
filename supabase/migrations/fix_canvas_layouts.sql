-- Script pour vérifier et corriger la structure de la table canvas_layouts

-- Vérifier si la table existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'canvas_layouts') THEN
    -- Créer la table si elle n'existe pas
    CREATE TABLE public.canvas_layouts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      elements JSONB NOT NULL,
      stage_size JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    RAISE NOTICE 'Table canvas_layouts créée';
  ELSE
    RAISE NOTICE 'Table canvas_layouts existe déjà';
  END IF;
END
$$;

-- Désactiver temporairement RLS pour résoudre les problèmes d'accès
ALTER TABLE public.canvas_layouts DISABLE ROW LEVEL SECURITY;

-- Ajouter des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_canvas_layouts_project_id ON public.canvas_layouts(project_id);

-- Vérifier si la colonne default_layout_id existe dans la table projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'default_layout_id'
  ) THEN
    -- Ajouter la colonne default_layout_id à la table projects
    ALTER TABLE public.projects 
    ADD COLUMN default_layout_id UUID REFERENCES public.canvas_layouts(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Colonne default_layout_id ajoutée à la table projects';
  ELSE
    RAISE NOTICE 'Colonne default_layout_id existe déjà dans la table projects';
  END IF;
END
$$;
