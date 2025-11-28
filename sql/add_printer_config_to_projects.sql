-- Script SQL pour ajouter la configuration d'imprimante dans la table projects
-- Date: 2025-11-27
-- Description: Ajout des colonnes pour gérer l'impression automatique via le module WCM DNP 620

-- Ajouter les colonnes de configuration imprimante
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS printer_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS printer_ip VARCHAR(255),
ADD COLUMN IF NOT EXISTS printer_endpoint VARCHAR(255) DEFAULT '/print',
ADD COLUMN IF NOT EXISTS printer_copies INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS printer_format VARCHAR(50) DEFAULT '10x15';

-- Ajouter un commentaire pour la documentation
COMMENT ON COLUMN projects.printer_enabled IS 'Active ou désactive l''impression automatique pour ce projet';
COMMENT ON COLUMN projects.printer_ip IS 'Adresse IP du module WCM (ex: http://192.168.1.100)';
COMMENT ON COLUMN projects.printer_endpoint IS 'Endpoint d''impression sur le module WCM (par défaut: /print)';
COMMENT ON COLUMN projects.printer_copies IS 'Nombre de copies à imprimer par défaut';
COMMENT ON COLUMN projects.printer_format IS 'Format d''impression (10x15, 15x20, 13x18)';

-- Créer une table pour logger les impressions (optionnel mais recommandé)
CREATE TABLE IF NOT EXISTS print_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  printer_ip VARCHAR(255),
  status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'pending'
  error_message TEXT,
  printed_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_print_logs_project_id ON print_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_print_logs_printed_at ON print_logs(printed_at DESC);
CREATE INDEX IF NOT EXISTS idx_print_logs_status ON print_logs(status);

-- Commentaires pour la table print_logs
COMMENT ON TABLE print_logs IS 'Historique des impressions pour le suivi et le debugging';
COMMENT ON COLUMN print_logs.status IS 'Statut de l''impression: success, failed, pending';
