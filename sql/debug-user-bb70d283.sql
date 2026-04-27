-- Diagnostic complet pour l'utilisateur bb70d283-b02e-4e22-9d06-a705952b366b
-- Problème: Dashboard affiche -391 période, 203 quota dispo, 594 photos générées
-- Mais la BDD affiche 5016 crédits restants

-- 1. INFORMATIONS UTILISATEUR
SELECT 
  id,
  email,
  created_at,
  last_login
FROM admin_users 
WHERE id = 'bb70d283-b02e-4e22-9d06-a705952b366b';

-- 2. TOUS LES PAIEMENTS DE CET UTILISATEUR
SELECT 
  id,
  plan,
  photo_quota,
  amount / 100.0 as amount_euros,
  status,
  stripe_subscription_status,
  photo_quota_reset_at,
  quota_expires_at,
  created_at,
  images_included
FROM admin_payments 
WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
ORDER BY created_at DESC;

-- 3. TOTAL DES CRÉDITS ACHETÉS
SELECT 
  COUNT(*) as nombre_paiements,
  SUM(photo_quota) as total_credits_achetes,
  SUM(amount) / 100.0 as total_paye_euros
FROM admin_payments 
WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
  AND status = 'succeeded';

-- 4. UTILISATION DU QUOTA (quota_usage table)
SELECT 
  quota_type,
  COUNT(*) as nombre_generations,
  MIN(consumed_at) as premiere_utilisation,
  MAX(consumed_at) as derniere_utilisation
FROM quota_usage 
WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
GROUP BY quota_type;

-- 5. TOTAL DES GÉNÉRATIONS DANS quota_usage
SELECT 
  COUNT(*) as total_generations_quota_usage
FROM quota_usage 
WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b';

-- 6. UTILISATION DES ADDONS
SELECT 
  au.addon_purchase_id,
  au.photos_consumed,
  au.photos_remaining,
  au.last_used_at,
  au.created_at,
  ap.addon_type,
  ap.addon_value,
  ap.status as addon_status
FROM addon_usage au
LEFT JOIN addon_purchases ap ON au.addon_purchase_id = ap.id
WHERE au.admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b';

-- 7. CALCUL DU QUOTA RESTANT (comme le code devrait le faire)
SELECT 
  -- Total acheté
  COALESCE(SUM(ap.photo_quota), 0) as credits_achetes,
  
  -- Total utilisé (quota_usage)
  (SELECT COUNT(*) 
   FROM quota_usage qu 
   WHERE qu.admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b') as credits_utilises,
  
  -- Calcul: Restant = Acheté - Utilisé
  COALESCE(SUM(ap.photo_quota), 0) - 
  COALESCE((SELECT COUNT(*) 
            FROM quota_usage qu 
            WHERE qu.admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'), 0) as credits_restants_calcules

FROM admin_payments ap
WHERE ap.admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
  AND ap.status = 'succeeded';

-- 8. VÉRIFIER S'IL Y A DES SESSIONS
SELECT 
  COUNT(*) as nombre_sessions,
  COUNT(DISTINCT project_id) as nombre_projets
FROM sessions 
WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b';

-- 9. VÉRIFIER LES GÉNÉRATIONS DANS D'AUTRES TABLES POSSIBLES
-- (au cas où quota_usage ne serait pas la seule source)
SELECT 
  'sessions' as table_name,
  COUNT(*) as count
FROM sessions 
WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'

UNION ALL

SELECT 
  'quota_usage' as table_name,
  COUNT(*) as count
FROM quota_usage 
WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b';

-- 10. DÉTAIL DES DERNIÈRES GÉNÉRATIONS
SELECT 
  id,
  quota_type,
  consumed_at,
  project_id,
  session_id
FROM quota_usage 
WHERE admin_user_id = 'bb70d283-b02e-4e22-9d06-a705952b366b'
ORDER BY consumed_at DESC
LIMIT 20;
