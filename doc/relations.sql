-- Relations entre les tables pour le décompte des images par admin utilisateur

-- 1. sessions.project_id -> projects.id
-- 2. projects.created_by -> admin_users.id
-- 3. admin_payments.admin_user_id -> admin_users.id

-- Exemple de requête pour compter le nombre de photos prises par un admin depuis le dernier quota reset :

SELECT COUNT(s.id) AS photos_count
FROM sessions s
JOIN projects p ON s.project_id = p.id
JOIN admin_users u ON p.created_by = u.id
JOIN admin_payments pay ON pay.admin_user_id = u.id
WHERE u.id = '<ADMIN_USER_ID>'
  AND s.created_at >= (
    SELECT photo_quota_reset_at
    FROM admin_payments
    WHERE admin_user_id = u.id
    ORDER BY photo_quota_reset_at DESC
    LIMIT 1
  );

-- Pour obtenir la date de reset du quota et le quota courant pour un admin :
SELECT photo_quota, photo_quota_reset_at
FROM admin_payments
WHERE admin_user_id = '<ADMIN_USER_ID>'
ORDER BY photo_quota_reset_at DESC
LIMIT 1;

-- Pour lier sessions à admin_users (créateur du projet) :
-- sessions.project_id -> projects.id -> projects.created_by -> admin_users.id

-- Pour lier admin_payments à admin_users :
-- admin_payments.admin_user_id -> admin_users.id
