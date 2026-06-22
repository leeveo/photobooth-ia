-- AJOUT MANUEL DE 2000 CRÉDITS PHOTOS POUR TCROCHET
-- Utilisateur: tcrochet@mobilactif.fr
-- User ID: bb70d283-b02e-4e22-9d06-a705952b366b

-- Étape 1: Vérifier que l'utilisateur existe
SELECT 
  '👤 UTILISATEUR' as info,
  id, 
  email, 
  created_at 
FROM admin_users 
WHERE id = 'bb70d283-b02e-4e22-9d06-a705952b366b';

-- Étape 2: Voir les crédits actuels
SELECT 
  '💳 PAIEMENTS EXISTANTS' as info,
  id,
  plan,
  photo_quota,
  status,
  stripe_subscription_status,
  created_at,
  photo_quota_reset_at,
  quota_expires_at
FROM admin_payments 
WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
ORDER BY created_at DESC;

-- Étape 3: Ajouter 2000 crédits photos valables 1 an
INSERT INTO admin_payments (
  admin_user_id,
  stripe_customer_id,
  stripe_subscription_id,
  plan,
  photo_quota,
  photo_quota_reset_at,
  amount,
  status,
  stripe_payment_id,
  images_included,
  stripe_subscription_status,
  quota_expires_at,
  invoice_number,
  created_at
) VALUES (
  'bb70d283-b02e-4e22-9d06-a705952b366b',               -- ID utilisateur tcrochet
  'manual_admin_' || gen_random_uuid(),                  -- ID client fictif
  'manual_sub_admin_' || gen_random_uuid(),              -- ID subscription fictif
  'Admin - Manuel',                                      -- Nom du plan
  2000,                                                  -- 🎯 2000 CRÉDITS PHOTOS
  NOW(),                                                 -- Reset commence maintenant
  0,                                                     -- Gratuit (ajout manuel)
  'succeeded',                                           -- Paiement réussi
  'manual_payment_admin_' || gen_random_uuid(),          -- ID paiement fictif
  2000,                                                  -- Même valeur que photo_quota
  'active',                                              -- Subscription active
  NOW() + INTERVAL '1 year',                             -- Expire dans 1 an
  'ADMIN-MANUAL-TCROCHET-' || to_char(NOW(), 'YYYYMMDD-HH24MISS'), -- Numéro de facture unique
  NOW()                                                  -- Date de création
)
RETURNING 
  id,
  plan,
  photo_quota,
  photo_quota_reset_at as debut_periode,
  quota_expires_at as expiration,
  '✅ 2000 CRÉDITS AJOUTÉS AVEC SUCCÈS !' as statut;

-- Étape 4: Vérification finale - Voir le total des crédits disponibles
SELECT 
  '📊 BILAN FINAL' as info,
  SUM(photo_quota) as total_credits_accordes,
  COUNT(*) as nombre_paiements
FROM admin_payments 
WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
  AND status = 'succeeded'
  AND quota_expires_at >= NOW();
