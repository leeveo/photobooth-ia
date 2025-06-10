-- Activer l'extension uuid-ossp si elle n'est pas déjà activée
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vérifier d'abord si la table layout_templates existe, sinon la créer
CREATE TABLE IF NOT EXISTS layout_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    layout_name TEXT, -- Ajout du champ layout_name
    description TEXT,
    category TEXT,
    elements JSONB NOT NULL,
    stage_size JSONB,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_public BOOLEAN DEFAULT TRUE,
    thumbnail_url TEXT
);

-- Assurons-nous que les autres colonnes nécessaires existent
ALTER TABLE layout_templates 
    ADD COLUMN IF NOT EXISTS layout_name TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS category TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Ajouter un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS layout_templates_created_by_idx ON layout_templates (created_by);
CREATE INDEX IF NOT EXISTS layout_templates_category_idx ON layout_templates (category);
