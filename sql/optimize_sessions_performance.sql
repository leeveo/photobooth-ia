-- =====================================================
-- OPTIMISATIONS SUPABASE POUR LA TABLE SESSIONS
-- =====================================================
-- Ce script optimise les performances pour les requêtes de mosaïque
-- Problème: timeout sur SELECT avec project_id, moderation et ORDER BY created_at

-- =====================================================
-- 1. ANALYSE DE LA REQUÊTE PROBLÉMATIQUE
-- =====================================================
-- Requête actuelle qui timeout:
-- SELECT id, result_s3_url, result_image_url, created_at, moderation 
-- FROM sessions 
-- WHERE project_id = 'b492a7b4-de73-4401-aa53-d98be285d07b' 
--   AND moderation IS NULL 
-- ORDER BY created_at DESC 
-- LIMIT 50;

-- =====================================================
-- 2. CRÉER DES INDEX COMPOSITES OPTIMAUX
-- =====================================================

-- Index principal pour project_id + moderation + created_at
-- Cet index couvre parfaitement notre requête
CREATE INDEX IF NOT EXISTS idx_sessions_project_moderation_created 
ON sessions (project_id, moderation, created_at DESC);

-- Index de sauvegarde pour project_id + created_at seulement
CREATE INDEX IF NOT EXISTS idx_sessions_project_created 
ON sessions (project_id, created_at DESC);

-- Index pour les sessions avec images valides (éviter les NULL)
CREATE INDEX IF NOT EXISTS idx_sessions_with_images 
ON sessions (project_id, created_at DESC) 
WHERE result_s3_url IS NOT NULL OR result_image_url IS NOT NULL;

-- =====================================================
-- 3. OPTIMISER LA STRUCTURE DE LA TABLE
-- =====================================================

-- Analyser les statistiques de la table pour l'optimiseur
ANALYZE sessions;

-- Vérifier la taille de la table et les index
SELECT 
    schemaname,
    tablename, 
    attname, 
    n_distinct, 
    correlation 
FROM pg_stats 
WHERE tablename = 'sessions' 
  AND attname IN ('project_id', 'created_at', 'moderation');

-- =====================================================
-- 4. REQUÊTE OPTIMISÉE ALTERNATIVE
-- =====================================================

-- Version optimisée de la requête avec EXPLAIN pour analyser
EXPLAIN (ANALYZE, BUFFERS) 
SELECT id, result_s3_url, result_image_url, created_at 
FROM sessions 
WHERE project_id = 'b492a7b4-de73-4401-aa53-d98be285d07b' 
  AND moderation IS NULL 
  AND (result_s3_url IS NOT NULL OR result_image_url IS NOT NULL)
ORDER BY created_at DESC 
LIMIT 50;

-- =====================================================
-- 5. REQUÊTE ALTERNATIVE AVEC PAGINATION
-- =====================================================

-- Si les index ne suffisent pas, utiliser une approche par pagination avec cursor
-- Étape 1: Obtenir l'ID de la dernière session récente
WITH recent_session AS (
  SELECT id, created_at 
  FROM sessions 
  WHERE project_id = 'b492a7b4-de73-4401-aa53-d98be285d07b'
    AND moderation IS NULL
  ORDER BY created_at DESC 
  LIMIT 1
),
-- Étape 2: Sélectionner les 50 sessions les plus récentes
paginated_sessions AS (
  SELECT id, result_s3_url, result_image_url, created_at
  FROM sessions s, recent_session r
  WHERE s.project_id = 'b492a7b4-de73-4401-aa53-d98be285d07b'
    AND s.moderation IS NULL
    AND s.created_at <= r.created_at
    AND (s.result_s3_url IS NOT NULL OR s.result_image_url IS NOT NULL)
  ORDER BY s.created_at DESC
  LIMIT 50
)
SELECT * FROM paginated_sessions;

-- =====================================================
-- 6. MAINTENANCE ET MONITORING
-- =====================================================

-- Vérifier l'utilisation des index
SELECT 
    schemaname, 
    tablename, 
    indexname, 
    idx_scan, 
    idx_tup_read, 
    idx_tup_fetch 
FROM pg_stat_user_indexes 
WHERE tablename = 'sessions';

-- Statistiques sur la table sessions
SELECT 
    n_tup_ins, 
    n_tup_upd, 
    n_tup_del, 
    n_live_tup, 
    n_dead_tup,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables 
WHERE relname = 'sessions';

-- =====================================================
-- 7. CONFIGURATION RECOMMANDÉE SUPABASE
-- =====================================================
-- Dans l'interface Supabase, vérifier:
-- 1. work_mem: augmenter à 256MB pour les requêtes complexes
-- 2. maintenance_work_mem: 512MB pour la création d'index
-- 3. effective_cache_size: 75% de la RAM disponible
-- 4. random_page_cost: 1.1 (pour SSD)

-- =====================================================
-- 8. REQUÊTE DE VÉRIFICATION FINALE
-- =====================================================

-- Test de performance après optimisation
SELECT COUNT(*) as total_sessions,
       COUNT(*) FILTER (WHERE moderation IS NULL) as unmoderated,
       COUNT(*) FILTER (WHERE result_s3_url IS NOT NULL OR result_image_url IS NOT NULL) as with_images,
       MIN(created_at) as oldest,
       MAX(created_at) as newest
FROM sessions 
WHERE project_id = 'b492a7b4-de73-4401-aa53-d98be285d07b';

-- =====================================================
-- NOTES D'IMPLÉMENTATION
-- =====================================================
-- 1. Exécuter ces requêtes dans l'éditeur SQL Supabase
-- 2. Les index peuvent prendre du temps à créer (plusieurs minutes)
-- 3. ANALYZE est important après création des index
-- 4. Surveiller les performances avec pg_stat_user_indexes
-- 5. Si ça ne suffit pas, envisager la partitioning par date