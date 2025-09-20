-- Script pour ajouter manuellement un pack de 100 photos
-- À exécuter dans votre base de données Supabase locale

-- 1. D'abord, trouvons votre admin_user_id
SELECT id, email, quota_used, quota_limit 
FROM admin_users 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Ensuite, insérez un achat d'addon (remplacez 'VOTRE_ADMIN_ID' par votre vraie ID)
INSERT INTO addon_purchases (
  admin_user_id,
  stripe_session_id,
  stripe_payment_intent_id,
  addon_type,
  addon_value,
  addon_name,
  price_paid,
  stripe_price_id,
  status
) VALUES (
  'VOTRE_ADMIN_ID', -- Remplacez par votre vraie admin_user_id
  'cs_test_manual_local_test',
  'pi_test_manual_local_test',
  'photo_pack',
  100,
  'Pack +100 Photos (Test Local)',
  9.90,
  'price_1S9K5gIgKYOzHnxE8pKcberV',
  'completed'
);

-- 3. Vérifiez que ça a été inséré
SELECT * FROM addon_purchases ORDER BY created_at DESC LIMIT 3;