-- Migration pour ajouter la colonne ai_source à la table sessions
-- Cette colonne permettra de tracker quel service IA a été utilisé (replicate, azure, etc.)

ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS ai_source VARCHAR(50) DEFAULT 'replicate';

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN sessions.ai_source IS 'Service IA utilisé pour générer l''image: replicate, azure, error, etc.';

-- Créer un index pour optimiser les requêtes si nécessaire
CREATE INDEX IF NOT EXISTS idx_sessions_ai_source ON sessions(ai_source);
