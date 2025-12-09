-- Script pour ajouter manuellement des crédits à un utilisateur
-- User ID: 17807572-c270-4520-9ee5-a4a2b3882e91

-- Étape 1: Vérifier que l'utilisateur existe
SELECT id, email, created_at 
FROM public.admin_users 
WHERE id = '17807572-c270-4520-9ee5-a4a2b3882e91';

-- Étape 2: Ajouter un paiement manuel avec des crédits
-- MODIFIEZ LES VALEURS CI-DESSOUS SELON VOS BESOINS:
-- - plan: 'Essentiel' (200 photos), 'Pro' (1000 photos), 'Premium' (5000 photos), ou 'Manuel' pour un montant personnalisé
-- - photo_quota: nombre de photos à ajouter (ex: 200, 1000, 5000, ou un nombre personnalisé)
-- - amount: montant en euros (ex: 19, 99, 299, ou 0 pour gratuit)

INSERT INTO public.admin_payments (
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
  '17807572-c270-4520-9ee5-a4a2b3882e91',           -- L'ID de votre utilisateur
  'manual_customer_' || gen_random_uuid(),          -- ID client fictif pour paiement manuel
  NULL,                                              -- Pas de subscription Stripe
  'Manuel',                                          -- 🔧 CHANGEZ LE PLAN: 'Essentiel', 'Pro', 'Premium', ou 'Manuel'
  1000,                                              -- 🔧 CHANGEZ LE QUOTA: nombre de photos (ex: 200, 1000, 5000)
  (NOW() + INTERVAL '1 month'),                     -- Reset dans 1 mois
  0,                                                 -- 🔧 CHANGEZ LE MONTANT: en euros (0 pour gratuit)
  'succeeded',                                       -- Status du paiement
  'manual_payment_' || gen_random_uuid(),           -- ID paiement fictif
  1000,                                              -- 🔧 MÊME VALEUR QUE photo_quota
  'active',                                          -- Subscription active
  (NOW() + INTERVAL '1 month'),                     -- Expiration dans 1 mois
  'MANUEL-' || to_char(NOW(), 'YYYYMMDD-HH24MISS'), -- Numéro de facture unique
  NOW()                                              -- Date de création
)
RETURNING *;

-- Étape 3: Vérifier l'insertion
SELECT 
  ap.id,
  ap.plan,
  ap.photo_quota,
  ap.amount,
  ap.status,
  ap.stripe_subscription_status,
  ap.photo_quota_reset_at,
  ap.quota_expires_at,
  ap.created_at,
  au.email
FROM public.admin_payments ap
JOIN public.admin_users au ON ap.admin_user_id = au.id
WHERE ap.admin_user_id = '17807572-c270-4520-9ee5-a4a2b3882e91'
ORDER BY ap.created_at DESC
LIMIT 5;

-- Étape 4 (OPTIONNEL): Vérifier le quota total de l'utilisateur
SELECT 
  au.email,
  au.id,
  COUNT(ap.id) as nombre_paiements,
  SUM(ap.photo_quota) as quota_total,
  SUM(ap.amount) as montant_total,
  MAX(ap.photo_quota_reset_at) as prochaine_reset
FROM public.admin_users au
LEFT JOIN public.admin_payments ap ON au.id = ap.admin_user_id
WHERE au.id = '17807572-c270-4520-9ee5-a4a2b3882e91'
GROUP BY au.id, au.email;
