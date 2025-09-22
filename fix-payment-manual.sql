-- Script SQL pour insérer manuellement le paiement manqué
-- Exécutez ceci directement dans Supabase SQL Editor

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
  stripe_invoice_id,
  invoice_number,
  created_at
) VALUES (
  'e5a63185-cbcc-476f-83dc-6526e58c68c9', -- ID de jumpwiththedevil.evhtribute@gmail.com
  'cus_T6NXAX6Fyh8STh', -- Customer ID de votre log Stripe
  'sub_1SAAmDRBtAFMZV17LDGzco4x', -- Subscription ID de votre log Stripe
  'price_1SA8hHRBtAFMZV17URFPVdai', -- Price ID Plan Essentiel
  400, -- 400 photos pour Plan Essentiel
  NOW() + INTERVAL '1 month', -- Reset dans 1 mois
  4900, -- 49€ en centimes
  'succeeded',
  'pi_3SAAmBRBtAFMZV171J8VpUCz', -- Payment Intent de votre log
  400, -- Images incluses
  'active',
  NOW() + INTERVAL '1 month', -- Expiration dans 1 mois
  'in_1SAAmBRBtAFMZV17vhZjw1WB', -- Invoice ID de votre log
  'BFC33A55-0004', -- Invoice number de votre log
  NOW()
);

-- Vérification
SELECT 
  admin_user_id,
  plan,
  photo_quota,
  amount/100 as amount_euros,
  status,
  created_at
FROM admin_payments 
WHERE admin_user_id = 'e5a63185-cbcc-476f-83dc-6526e58c68c9'
ORDER BY created_at DESC;