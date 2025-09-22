import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST() {
  try {
    console.log('[CREATE_TABLES] Début de la création des tables...');

    // Script SQL pour créer les tables de tracking de quota
    const createTablesSQL = `
-- Table pour tracker les quotas de manière séparée
CREATE TABLE IF NOT EXISTS quota_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  
  -- Type de quota consommé
  quota_type VARCHAR(20) NOT NULL CHECK (quota_type IN ('monthly', 'addon')),
  
  -- Pour les addons : référence à l'achat d'addon
  addon_purchase_id UUID REFERENCES addon_purchases(id) ON DELETE SET NULL,
  
  -- Métadonnées
  consumed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour tracker l'utilisation des addons individuellement
CREATE TABLE IF NOT EXISTS addon_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  addon_purchase_id UUID NOT NULL REFERENCES addon_purchases(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  
  -- Tracking des photos
  photos_consumed INTEGER DEFAULT 0 NOT NULL,
  photos_remaining INTEGER NOT NULL,
  
  -- Métadonnées
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT addon_usage_photos_check CHECK (photos_consumed >= 0 AND photos_remaining >= 0),
  CONSTRAINT addon_usage_unique_addon UNIQUE (addon_purchase_id)
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_quota_usage_admin_type ON quota_usage(admin_user_id, quota_type);
CREATE INDEX IF NOT EXISTS idx_quota_usage_consumed_at ON quota_usage(consumed_at);
CREATE INDEX IF NOT EXISTS idx_addon_usage_admin ON addon_usage(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_addon_usage_purchase ON addon_usage(addon_purchase_id);

-- Fonction trigger pour initialiser automatiquement l'usage des addons
CREATE OR REPLACE FUNCTION initialize_addon_usage() 
RETURNS TRIGGER AS $$
BEGIN
  -- Créer automatiquement un enregistrement addon_usage quand un addon est acheté
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO addon_usage (
      addon_purchase_id,
      admin_user_id,
      photos_consumed,
      photos_remaining
    ) VALUES (
      NEW.id,
      NEW.admin_user_id,
      0,
      NEW.addon_value
    ) ON CONFLICT (addon_purchase_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur addon_purchases
DROP TRIGGER IF EXISTS trigger_initialize_addon_usage ON addon_purchases;
CREATE TRIGGER trigger_initialize_addon_usage
  AFTER UPDATE ON addon_purchases
  FOR EACH ROW
  EXECUTE FUNCTION initialize_addon_usage();
`;

    // Exécuter le script SQL
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: createTablesSQL 
    });

    if (error) {
      // Si la fonction RPC n'existe pas, essayons d'exécuter les commandes une par une
      console.log('[CREATE_TABLES] Tentative d\'exécution manuelle...');
      
      const sqlCommands = createTablesSQL
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0);

      const results = [];
      
      for (const command of sqlCommands) {
        try {
          const { data: cmdData, error: cmdError } = await supabase
            .from('_dummy_table_that_does_not_exist')
            .select('*'); // Cette requête va échouer mais nous permet de tester la connexion
          
          // Utilisons une approche alternative
          console.log(`[CREATE_TABLES] Commande: ${command.substring(0, 50)}...`);
          results.push({ command: command.substring(0, 50), status: 'attempted' });
        } catch (err) {
          console.log(`[CREATE_TABLES] Erreur sur commande: ${err.message}`);
        }
      }

      return NextResponse.json({
        success: false,
        message: 'Les tables ne peuvent pas être créées via l\'API. Vous devez exécuter le script SQL manuellement dans Supabase.',
        sqlScript: createTablesSQL,
        instructions: [
          '1. Allez sur votre tableau de bord Supabase',
          '2. Ouvrez l\'éditeur SQL',
          '3. Copiez-collez le script SQL fourni',
          '4. Exécutez le script',
          '5. Revenez ici pour migrer les addons'
        ]
      });
    }

    console.log('[CREATE_TABLES] Tables créées avec succès');

    return NextResponse.json({
      success: true,
      message: 'Tables de tracking de quota créées avec succès',
      tablesCreated: ['quota_usage', 'addon_usage'],
      indexesCreated: ['idx_quota_usage_admin_type', 'idx_quota_usage_consumed_at', 'idx_addon_usage_admin', 'idx_addon_usage_purchase'],
      triggersCreated: ['initialize_addon_usage']
    });

  } catch (error) {
    console.error('[CREATE_TABLES] Erreur:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      sqlScript: createTablesSQL
    }, { status: 500 });
  }
}