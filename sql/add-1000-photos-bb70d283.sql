-- AJOUT MANUEL DE 1000 PHOTOS POUR L'UTILISATEUR ADMIN
-- User ID: bb70d283-b02e-4e22-9d06-a705952b366b

-- Étape 1: Vérifier que l'utilisateur existe
SELECT 
  '👤 UTILISATEUR' as info,
  id, 
  email, 
  created_at 
FROM admin_users 
WHERE id = 'bb70d283-b02e-4e22-9d06-a705952b366b';

-- Étape 2: Vérifier les paiements existants (pour voir s'il y en a déjà)
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

-- Étape 3: Ajouter un paiement manuel avec 1000 photos
-- Ce paiement sera valide pendant 1 an (compte admin)
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
  'bb70d283-b02e-4e22-9d06-a705952b366b',           -- L'ID de l'utilisateur admin
  'manual_admin_' || gen_random_uuid(),              -- ID client fictif
  'manual_sub_admin_' || gen_random_uuid(),          -- ID subscription fictif
  'Admin - Manuel',                                  -- Nom du plan
  1000,                                              -- 🎯 1000 PHOTOS DE QUOTA
  NOW(),                                             -- Reset commence maintenant
  0,                                                 -- Gratuit (compte admin)
  'succeeded',                                       -- Paiement réussi
  'manual_payment_admin_' || gen_random_uuid(),     -- ID paiement fictif
  1000,                                              -- Même valeur que photo_quota
  'active',                                          -- Subscription active
  NOW() + INTERVAL '1 year',                         -- Expire dans 1 an
  'ADMIN-MANUAL-' || to_char(NOW(), 'YYYYMMDD-HH24MISS'), -- Numéro de facture unique
  NOW()                                              -- Date de création
)
RETURNING 
  id,
  plan,
  photo_quota,
  photo_quota_reset_at as debut_periode,
  quota_expires_at as expiration,
  '✅ 1000 PHOTOS AJOUTÉES AVEC SUCCÈS !' as statut;

-- Étape 4: Vérifier l'insertion
SELECT 
  '✅ VÉRIFICATION' as info,
  ap.id,
  ap.plan,
  ap.photo_quota as quota,
  ap.amount / 100.0 as montant_euros,
  ap.status,
  ap.stripe_subscription_status,
  ap.created_at as cree_le,
  ap.photo_quota_reset_at as debut_periode,
  ap.quota_expires_at as expire_le,
  au.email
FROM admin_payments ap
JOIN admin_users au ON ap.admin_user_id = au.id
WHERE ap.admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
ORDER BY ap.created_at DESC
LIMIT 5;

-- Étape 5: Calculer le quota total disponible
WITH paiements AS (
  SELECT 
    SUM(photo_quota) as quota_total_achete
  FROM admin_payments
  WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
    AND status = 'succeeded'
    AND stripe_subscription_status IN ('active', 'trialing')
    AND quota_expires_at >= NOW()
),
addons AS (
  SELECT 
    COALESCE(SUM(addon_value), 0) as total_addon
  FROM addon_purchases
  WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
    AND status = 'completed'
),
consommation AS (
  SELECT 
    COUNT(*) as photos_utilisees
  FROM quota_usage
  WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
    AND consumed_at >= (
      SELECT photo_quota_reset_at 
      FROM admin_payments
      WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
        AND status = 'succeeded'
        AND stripe_subscription_status IN ('active', 'trialing')
      ORDER BY created_at DESC
      LIMIT 1
    )
)
SELECT 
  '📊 QUOTA FINAL' as info,
  p.quota_total_achete as quota_mensuel,
  a.total_addon as photos_addon,
  (p.quota_total_achete + a.total_addon) as quota_total,
  c.photos_utilisees as photos_consommees,
  (p.quota_total_achete + a.total_addon - c.photos_utilisees) as credits_restants,
  '✨ Utilisateur peut maintenant générer ' || (p.quota_total_achete + a.total_addon - c.photos_utilisees) || ' photos !' as message
FROM paiements p, addons a, consommation c;

-- Étape 6: Instructions pour le dashboard
SELECT 
  '📱 INSTRUCTIONS' as info,
  'Rafraîchissez le dashboard de l''utilisateur pour voir les 1000 photos disponibles' as action_1,
  'Le quota sera valide pendant 1 an (jusqu''au ' || to_char(NOW() + INTERVAL '1 year', 'DD/MM/YYYY') || ')' as action_2,
  'Quota reset automatique chaque mois (reset_at = ' || to_char(NOW(), 'DD/MM/YYYY') || ')' as action_3;
