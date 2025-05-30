-- Configuration des extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des utilisateurs (en complément de auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')) NOT NULL
);

-- Trigger pour mise à jour automatique du timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Table des arrière-plans
CREATE TABLE IF NOT EXISTS public.backgrounds (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    storage_path TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER update_backgrounds_updated_at
    BEFORE UPDATE ON public.backgrounds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Table des styles
CREATE TABLE IF NOT EXISTS public.styles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('m', 'f', 'ag', 'af')),
    style_key TEXT NOT NULL,
    description TEXT,
    preview_image TEXT NOT NULL,
    storage_path TEXT,
    variations INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    
    -- Contrainte d'unicité pour éviter les doublons de styles
    CONSTRAINT unique_gender_style_key UNIQUE (gender, style_key)
);

CREATE TRIGGER update_styles_updated_at
    BEFORE UPDATE ON public.styles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Table des paramètres
CREATE TABLE IF NOT EXISTS public.settings (
    id INT PRIMARY KEY DEFAULT 1, -- Un seul enregistrement
    app_name TEXT NOT NULL DEFAULT 'Photobooth IA',
    primary_color TEXT NOT NULL DEFAULT '#811A53',
    secondary_color TEXT NOT NULL DEFAULT '#E5E40A',
    logo_url TEXT DEFAULT '/photobooth-ia/logo.png',
    home_screen_message TEXT DEFAULT 'C''est vous le mannequin !',
    enable_qr_codes BOOLEAN DEFAULT TRUE,
    privacy_notice TEXT DEFAULT 'Texte de confidentialité par défaut...',
    default_gender TEXT DEFAULT 'm' CHECK (default_gender IN ('m', 'f', 'ag', 'af')),
    max_processing_time INT DEFAULT 60,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Table des sessions utilisateurs (pour suivre l'usage)
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_email TEXT,
    style_id UUID REFERENCES public.styles(id),
    gender TEXT,
    style_key TEXT,
    result_image_url TEXT,
    result_s3_url TEXT,
    processing_time_ms INT,
    is_success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insertion des données par défaut
INSERT INTO public.settings (app_name, primary_color, secondary_color, logo_url, home_screen_message, updated_at)
VALUES ('Photobooth IA', '#811A53', '#E5E40A', '/photobooth-ia/logo.png', 'C''est vous le mannequin !', NOW())
ON CONFLICT (id) DO NOTHING;
