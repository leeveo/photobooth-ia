-- =======================================================================
-- SETUP COMPLET : Table print_logs + RLS policies
-- À exécuter dans Supabase > SQL Editor
-- =======================================================================

-- 1. Créer la table print_logs (si elle n'existe pas déjà)
CREATE TABLE IF NOT EXISTS print_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  printer_ip VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'success', 'failed'
  error_message TEXT,
  printed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB  -- stocke { copies: N, format: '10x15', ... }
);

-- 2. Index pour les performances (polling du back-office)
CREATE INDEX IF NOT EXISTS idx_print_logs_project_id   ON print_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_print_logs_status        ON print_logs(status);
CREATE INDEX IF NOT EXISTS idx_print_logs_printed_at    ON print_logs(printed_at DESC);
-- Index composé pour la requête du back-office : WHERE project_id=? AND status='pending'
CREATE INDEX IF NOT EXISTS idx_print_logs_project_status ON print_logs(project_id, status);

-- 3. Activer RLS
ALTER TABLE print_logs ENABLE ROW LEVEL SECURITY;

-- 4. Politique : le front-office peut insérer des demandes d'impression
--    (utilisateurs anonymes ou authentifiés)
DROP POLICY IF EXISTS "allow_insert_print_logs" ON print_logs;
CREATE POLICY "allow_insert_print_logs"
  ON print_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 5. Politique : le back-office (admin authentifié) peut lire tous les logs
DROP POLICY IF EXISTS "allow_select_print_logs" ON print_logs;
CREATE POLICY "allow_select_print_logs"
  ON print_logs
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 6. Politique : le back-office peut mettre à jour le statut
DROP POLICY IF EXISTS "allow_update_print_logs" ON print_logs;
CREATE POLICY "allow_update_print_logs"
  ON print_logs
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 7. Commentaires
COMMENT ON TABLE print_logs IS 'File d''attente et historique des impressions photobooth';
COMMENT ON COLUMN print_logs.status IS 'pending → processing → success | failed';
COMMENT ON COLUMN print_logs.metadata IS 'Ex: {"copies": 2, "format": "10x15"}';
