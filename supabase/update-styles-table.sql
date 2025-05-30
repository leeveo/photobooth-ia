-- Ajouter les colonnes pour les URLs alternatives si elles n'existent pas
ALTER TABLE public.styles 
ADD COLUMN IF NOT EXISTS supabase_url TEXT,
ADD COLUMN IF NOT EXISTS s3_url TEXT;

-- Afficher la structure actuelle de la table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'styles';
