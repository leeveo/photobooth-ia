-- DIAGNOSTIC COMPLET UTILISATEUR bb70d283-b02e-4e22-9d06-a705952b366b
-- Problème: Dashboard vs BDD incohérence

SET search_path TO public;

-- ========================================
-- 1. INFORMATIONS UTILISATEUR
-- ========================================
SELECT '=== UTILISATEUR ===' as section;
SELECT 
  id,
  email,
  created_at,
  last_login
FROM admin_users 
WHERE id = 'bb70d283-b02e-4e22-9d06-a705952b366b';

-- ========================================
-- 2. PAIEMENTS ACTIFS
-- ========================================
SELECT '=== PAIEMENTS ACTIFS ===' as section;
SELECT 
  id,
  plan,
  photo_quota,
  amount / 100.0 as amount_euros,
  status,
  stripe_subscription_status,
  created_at as paiement_cree_le,
  photo_quota_reset_at as date_reset_quota,
  quota_expires_at as date_expiration,
  CASE 
    WHEN quota_expires_at >= NOW() THEN '✅ Actif'
    ELSE '❌ Expiré'
  END as statut_expiration,
  images_included
FROM admin_payments 
WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
  AND status = 'succeeded'
  AND stripe_subscription_status IN ('active', 'trialing')
ORDER BY created_at DESC;

-- ========================================
-- 3. TOUS LES PAIEMENTS (MÊME INACTIFS)
-- ========================================
SELECT '=== TOUS LES PAIEMENTS ===' as section;
SELECT 
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

-- ========================================
-- 4. CALCUL SELON DASHBOARD (depuis created_at du dernier paiement actif)
-- ========================================
SELECT '=== CALCUL SELON DASHBOARD ===' as section;
WITH dernier_paiement AS (
  SELECT 
    photo_quota,
    created_at as date_reference
  FROM admin_payments 
  WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
    AND status = 'succeeded'
    AND stripe_subscription_status IN ('active', 'trialing')
    AND quota_expires_at >= NOW()
  ORDER BY created_at DESC
  LIMIT 1
),
addons_totaux AS (
  SELECT COALESCE(SUM(addon_value), 0) as total_addon
  FROM addon_purchases
  WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
    AND status = 'completed'
),
consommation_dashboard AS (
  SELECT COUNT(*) as photos_utilisees
  FROM quota_usage
  WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
    AND consumed_at >= (SELECT date_reference FROM dernier_paiement)
)
SELECT 
  dp.photo_quota as quota_base,
  at.total_addon as photos_addon,
  (dp.photo_quota + at.total_addon) as quota_total,
  cd.photos_utilisees as photos_consommees,
  ((dp.photo_quota + at.total_addon) - cd.photos_utilisees) as credits_restants_dashboard,
  dp.date_reference as depuis_date,
  NOW() - dp.date_reference as periode_jours
FROM dernier_paiement dp, addons_totaux at, consommation_dashboard cd;

-- ========================================
-- 5. CALCUL SELON QUOTA-MANAGER (depuis photo_quota_reset_at)
-- ========================================
SELECT '=== CALCUL SELON QUOTA-MANAGER ===' as section;
WITH dernier_paiement AS (
  SELECT 
    photo_quota,
    photo_quota_reset_at as date_reference
  FROM admin_payments 
  WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
    AND status = 'succeeded'
    AND stripe_subscription_status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1
),
addons_totaux AS (
  SELECT COALESCE(SUM(addon_value), 0) as total_addon
  FROM addon_purchases
  WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
    AND status = 'completed'
),
consommation_quota_manager AS (
  SELECT COUNT(*) as photos_utilisees
  FROM quota_usage
  WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
    AND consumed_at >= (SELECT date_reference FROM dernier_paiement)
)
SELECT 
  dp.photo_quota as quota_base,
  at.total_addon as photos_addon,
  (dp.photo_quota + at.total_addon) as quota_total,
  cq.photos_utilisees as photos_consommees,
  ((dp.photo_quota + at.total_addon) - cq.photos_utilisees) as credits_restants_quota_manager,
  dp.date_reference as depuis_date,
  NOW() - dp.date_reference as periode_jours
FROM dernier_paiement dp, addons_totaux at, consommation_quota_manager cq;

-- ========================================
-- 6. ADDONS EN DÉTAIL
-- ========================================
SELECT '=== ADDONS ===' as section;
SELECT 
  id,
  addon_type,
  addon_value as photos,
  status,
  created_at
FROM addon_purchases
WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
ORDER BY created_at DESC;

-- ========================================
-- 7. CONSOMMATION PAR JOUR (derniers 30 jours)
-- ========================================
SELECT '=== CONSOMMATION PAR JOUR ===' as section;
SELECT 
  DATE(consumed_at) as jour,
  COUNT(*) as photos_generees,
  quota_type
FROM quota_usage
WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
  AND consumed_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(consumed_at), quota_type
ORDER BY jour DESC;

-- ========================================
-- 8. TOTAL DES GÉNÉRATIONS DEPUIS LE DÉBUT
-- ========================================
SELECT '=== TOTAL GÉNÉRATIONS ===' as section;
SELECT 
  COUNT(*) as total_generations_all_time,
  MIN(consumed_at) as premiere_generation,
  MAX(consumed_at) as derniere_generation
FROM quota_usage
WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b';

-- ========================================
-- 9. DIFFÉRENCE ENTRE LES DEUX MÉTHODES DE CALCUL
-- ========================================
SELECT '=== ANALYSE DIFFÉRENCE ===' as section;
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
)
SELECT 
  dp.created_at as date_creation_paiement,
  dp.photo_quota_reset_at as date_reset_quota,
  dp.photo_quota_reset_at - dp.created_at as difference_dates,
  (SELECT COUNT(*) FROM quota_usage 
   WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
   AND consumed_at >= dp.created_at) as photos_depuis_created_at,
  (SELECT COUNT(*) FROM quota_usage 
   WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
   AND consumed_at >= dp.photo_quota_reset_at) as photos_depuis_reset_at,
  (SELECT COUNT(*) FROM quota_usage 
   WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
   AND consumed_at >= dp.created_at) - 
  (SELECT COUNT(*) FROM quota_usage 
   WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
   AND consumed_at >= dp.photo_quota_reset_at) as difference_comptage
FROM dernier_paiement dp;
