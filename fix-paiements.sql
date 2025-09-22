-- Script SQL de réparation directe des paiements orphelins

-- 1. Voir l'état actuel
SELECT 
  'UTILISATEURS' as type,
  COUNT(*) as count,
  NULL as email,
  NULL as quota
FROM admin_users

UNION ALL

SELECT 
  'PAIEMENTS_TOTAL' as type,
  COUNT(*) as count,
  NULL as email,
  SUM(photo_quota) as quota
FROM admin_payments

UNION ALL

SELECT 
  'PAIEMENTS_ORPHELINS' as type,
  COUNT(*) as count,
  NULL as email,
  SUM(photo_quota) as quota
FROM admin_payments 
WHERE admin_email IS NULL OR admin_email = ''

UNION ALL

SELECT 
  'PAIEMENTS_LIES' as type,
  COUNT(*) as count,
  NULL as email,
  SUM(photo_quota) as quota
FROM admin_payments 
WHERE admin_email IS NOT NULL AND admin_email != '';

-- 2. Lister les emails disponibles
SELECT 
  'EMAIL_DISPONIBLE' as type,
  ROW_NUMBER() OVER (ORDER BY created_at DESC) as count,
  email,
  NULL as quota
FROM admin_users 
ORDER BY created_at DESC;

-- 3. Mise à jour : Lier TOUS les paiements orphelins au premier utilisateur
UPDATE admin_payments 
SET 
  admin_email = (SELECT email FROM admin_users ORDER BY created_at DESC LIMIT 1),
  admin_user_id = (SELECT id FROM admin_users ORDER BY created_at DESC LIMIT 1),
  updated_at = NOW()
WHERE admin_email IS NULL OR admin_email = '';

-- 4. Vérification après réparation
SELECT 
  'APRES_REPARATION' as type,
  COUNT(*) as count,
  admin_email as email,
  SUM(photo_quota) as quota_total
FROM admin_payments 
WHERE admin_email IS NOT NULL 
GROUP BY admin_email
ORDER BY quota_total DESC;