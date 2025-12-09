-- Correction: Supprimer le paiement avec 1000 photos et en créer un nouveau avec 10 photos
-- User ID: 17807572-c270-4520-9ee5-a4a2b3882e91

-- Étape 1: Supprimer le paiement incorrect
DELETE FROM public.admin_payments 
WHERE id = '5aa2b648-7529-470f-ac08-84ba3d5935e9';

-- Étape 2: Créer le nouveau paiement avec 10 photos
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
  'Manuel',                                          -- Plan manuel
  10,                                                -- ✅ 10 photos seulement
  (NOW() + INTERVAL '1 month'),                     -- Reset dans 1 mois
  0,                                                 -- Gratuit
  'succeeded',                                       -- Status du paiement
  'manual_payment_' || gen_random_uuid(),           -- ID paiement fictif
  10,                                                -- ✅ 10 photos incluses
  'active',                                          -- Subscription active
  (NOW() + INTERVAL '1 month'),                     -- Expiration dans 1 mois
  'MANUEL-' || to_char(NOW(), 'YYYYMMDD-HH24MISS'), -- Numéro de facture unique
  NOW()                                              -- Date de création
)
RETURNING *;

-- Étape 3: Vérifier la correction
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
