-- Création de la table pour traquer les achats de packs supplémentaires
CREATE TABLE IF NOT EXISTS addon_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  addon_type TEXT NOT NULL, -- 'photo_pack'
  addon_value INTEGER NOT NULL, -- nombre de photos ajoutées
  addon_name TEXT NOT NULL, -- nom du pack (ex: "Pack +100 Photos")
  price_paid DECIMAL(10,2) NOT NULL, -- prix payé en euros
  stripe_price_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_addon_purchases_admin_user_id ON addon_purchases(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_addon_purchases_stripe_session_id ON addon_purchases(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_addon_purchases_created_at ON addon_purchases(created_at);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_addon_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà, puis le recréer
DROP TRIGGER IF EXISTS addon_purchases_updated_at ON addon_purchases;
CREATE TRIGGER addon_purchases_updated_at
  BEFORE UPDATE ON addon_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_addon_purchases_updated_at();