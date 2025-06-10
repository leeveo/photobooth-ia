-- Activer l'extension uuid-ossp si elle n'est pas déjà activée
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vérifier d'abord si la table layout_templates existe, sinon la créer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'layout_templates'
  ) THEN
    -- Créer la table de zéro avec la structure correcte
    CREATE TABLE layout_templates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      layout_name TEXT NOT NULL, -- Champ obligatoire pour stocker le nom du layout
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
    
    -- Ajouter les index pour améliorer les performances
    CREATE INDEX IF NOT EXISTS layout_templates_created_by_idx ON layout_templates (created_by);
    CREATE INDEX IF NOT EXISTS layout_templates_category_idx ON layout_templates (category);
  ELSE
    -- Si la table existe, nous nous assurons que les colonnes nécessaires existent
    -- et modifions les contraintes si nécessaire
    
    -- Assurez-vous que layout_name existe et n'est pas NULL
    ALTER TABLE layout_templates 
      ADD COLUMN IF NOT EXISTS layout_name TEXT;
      
    -- Mettre à jour les valeurs NULL de layout_name avec le nom du template
    UPDATE layout_templates SET layout_name = name WHERE layout_name IS NULL;
    
    -- Ajouter d'autres colonnes si nécessaires
    ALTER TABLE layout_templates 
      ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
      ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS category TEXT,
      ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
  END IF;
END $$;

-- Ajout d'une fonction et d'un déclencheur pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimez le déclencheur s'il existe déjà
DROP TRIGGER IF EXISTS update_layout_templates_updated_at ON layout_templates;

-- Créez le déclencheur
CREATE TRIGGER update_layout_templates_updated_at
BEFORE UPDATE ON layout_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
