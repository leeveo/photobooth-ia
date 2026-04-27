-- VÉRIFICATION RAPIDE - Utilisateur bb70d283-b02e-4e22-9d06-a705952b366b

-- 1. Info utilisateur
SELECT 
  '👤 UTILISATEUR' as info,
  email,
  created_at as inscrit_le
FROM admin_users 
WHERE id = 'bb70d283-b02e-4e22-9d06-a705952b366b';

-- 2. Paiement actif et dates clés
SELECT 
  '💳 PAIEMENT ACTIF' as info,
  plan,
  photo_quota as quota_mensuel,
  created_at as paiement_cree_le,
  photo_quota_reset_at as debut_periode_actuelle,
  quota_expires_at as expire_le,
  EXTRACT(DAY FROM NOW() - created_at) as jours_depuis_creation,
  EXTRACT(DAY FROM NOW() - photo_quota_reset_at) as jours_depuis_reset
FROM admin_payments 
WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
  AND status = 'succeeded'
  AND stripe_subscription_status IN ('active', 'trialing')
  AND quota_expires_at >= NOW()
ORDER BY created_at DESC
LIMIT 1;

-- 3. Addons
SELECT 
  '🎁 ADDONS' as info,
  SUM(addon_value) as total_photos_addon,
  COUNT(*) as nombre_addons
FROM addon_purchases
WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
  AND status = 'completed';

-- 4. Comparaison des comptages
WITH dernier_paiement AS (
  SELECT 
    photo_quota,
    created_at,
    photo_quota_reset_at
  FROM admin_payments 
  WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
    AND status = 'succeeded'
    AND stripe_subscription_status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1
),
addons AS (
  SELECT COALESCE(SUM(addon_value), 0) as total
  FROM addon_purchases
  WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
    AND status = 'completed'
)
SELECT 
  '📊 CALCULS' as info,
  dp.photo_quota + a.total as quota_total,
  
  -- Méthode INCORRECTE (dashboard avant fix)
  (SELECT COUNT(*) FROM quota_usage 
   WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
   AND consumed_at >= dp.created_at) as photos_depuis_creation_paiement,
  
  -- Méthode CORRECTE (après fix)
  (SELECT COUNT(*) FROM quota_usage 
   WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
   AND consumed_at >= dp.photo_quota_reset_at) as photos_depuis_reset,
  
  -- Crédits restants (méthode correcte)
  (dp.photo_quota + a.total) - 
  (SELECT COUNT(*) FROM quota_usage 
   WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
   AND consumed_at >= dp.photo_quota_reset_at) as credits_restants,
  
  -- Différence
  (SELECT COUNT(*) FROM quota_usage 
   WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
   AND consumed_at >= dp.created_at) -
  (SELECT COUNT(*) FROM quota_usage 
   WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
   AND consumed_at >= dp.photo_quota_reset_at) as difference_entre_methodes
FROM dernier_paiement dp, addons a;

-- 5. Activité récente
SELECT 
  '📅 ACTIVITÉ' as info,
  DATE(consumed_at) as jour,
  COUNT(*) as photos
FROM quota_usage
WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
  AND consumed_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(consumed_at)
ORDER BY jour DESC;
