-- Migration : Ajouter les colonnes manquantes à la table sessions
-- À exécuter dans Supabase > SQL Editor si la page print-monitor retourne une erreur 500

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS moderation VARCHAR(10);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS result_s3_url TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS result_image_url TEXT;

-- Index utile pour filtrer les non-modérées
CREATE INDEX IF NOT EXISTS idx_sessions_moderation ON sessions(moderation);
