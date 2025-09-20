-- SOLUTION IMMÉDIATE: Réduire les limites pendant l'optimisation
-- 
-- ÉTAPE 1: Exécuter ces requêtes dans l'interface SQL de Supabase
-- pour créer les index nécessaires

-- Index principal pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_sessions_project_moderation_created 
ON sessions (project_id, moderation, created_at DESC);

-- Index pour les sessions avec images uniquement
CREATE INDEX IF NOT EXISTS idx_sessions_with_images 
ON sessions (project_id, created_at DESC) 
WHERE result_s3_url IS NOT NULL;

-- Analyser la table après création des index
ANALYZE sessions;

-- ÉTAPE 2: Tester les performances après création des index
-- Cette requête devrait être plus rapide
SELECT id, result_s3_url, result_image_url, created_at
FROM sessions 
WHERE project_id = 'b492a7b4-de73-4401-aa53-d98be285d07b' 
  AND moderation IS NULL 
  AND result_s3_url IS NOT NULL
ORDER BY created_at DESC 
LIMIT 20;

-- ÉTAPE 3: Si toujours lent, requête alternative par pagination
WITH recent_sessions AS (
  SELECT id, result_s3_url, result_image_url, created_at,
         ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
  FROM sessions 
  WHERE project_id = 'b492a7b4-de73-4401-aa53-d98be285d07b' 
    AND moderation IS NULL 
    AND result_s3_url IS NOT NULL
  LIMIT 100  -- Plus large pool pour sélectionner
)
SELECT id, result_s3_url, result_image_url, created_at
FROM recent_sessions 
WHERE rn <= 50
ORDER BY created_at DESC;