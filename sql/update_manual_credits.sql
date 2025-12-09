-- Alternative: Mettre à jour le paiement existant pour passer de 1000 à 10 photos
-- User ID: 17807572-c270-4520-9ee5-a4a2b3882e91
-- Payment ID: 5aa2b648-7529-470f-ac08-84ba3d5935e9

UPDATE public.admin_payments
SET 
  photo_quota = 10,           -- ✅ Réduire à 10 photos
  images_included = 10        -- ✅ Mettre à jour aussi images_included
WHERE id = '5aa2b648-7529-470f-ac08-84ba3d5935e9'
RETURNING *;

-- Vérifier la mise à jour
SELECT 
  ap.id,
  ap.plan,
  ap.photo_quota,
  ap.images_included,
  ap.amount,
  ap.status,
  ap.stripe_subscription_status,
  ap.photo_quota_reset_at,
  ap.quota_expires_at,
  ap.created_at,
  au.email
FROM public.admin_payments ap
JOIN public.admin_users au ON ap.admin_user_id = au.id
WHERE ap.id = '5aa2b648-7529-470f-ac08-84ba3d5935e9';
