-- Table des projets
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,  -- URL-friendly identifier
    description TEXT,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#811A53',
    secondary_color TEXT DEFAULT '#E5E40A',
    home_message TEXT DEFAULT 'C''est vous le mannequin !',
    privacy_notice TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- Ajout des colonnes de référence aux projets dans les tables existantes
ALTER TABLE public.backgrounds ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.styles ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- Table de configuration par projet
CREATE TABLE IF NOT EXISTS public.project_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    default_gender TEXT DEFAULT 'm' CHECK (default_gender IN ('m', 'f', 'ag', 'af')),
    enable_qr_codes BOOLEAN DEFAULT TRUE,
    enable_fullscreen BOOLEAN DEFAULT TRUE,
    show_countdown BOOLEAN DEFAULT TRUE,
    max_processing_time INT DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger pour mise à jour automatique du timestamp
CREATE OR REPLACE FUNCTION update_updated_at_projects()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_projects();

CREATE TRIGGER update_project_settings_updated_at
    BEFORE UPDATE ON public.project_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_projects();

-- Politiques de sécurité pour les projets
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tout le monde peut voir les projets actifs" ON public.projects
    FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Les administrateurs peuvent tout faire avec les projets" ON public.projects
    FOR ALL TO authenticated USING (is_admin());

-- Politiques de sécurité pour les paramètres de projet
ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tout le monde peut voir les paramètres de projet" ON public.project_settings
    FOR SELECT USING (true);
CREATE POLICY "Les administrateurs peuvent modifier les paramètres de projet" ON public.project_settings
    FOR ALL TO authenticated USING (is_admin());
