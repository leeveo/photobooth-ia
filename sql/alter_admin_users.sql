alter table public.admin_users
  drop column if exists stripe_customer_id,
  drop column if exists stripe_subscription_id,
  drop column if exists plan,
  drop column if exists photo_quota,
  drop column if exists photo_quota_reset_at;
