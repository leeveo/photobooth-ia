create table public.admin_payments (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  plan text,
  photo_quota integer,
  photo_quota_reset_at timestamp with time zone,
  amount integer not null,
  status text not null,
  stripe_payment_id text,
  images_included integer,
  created_at timestamp with time zone default now()
);

-- Index for faster lookup
create index idx_admin_payments_admin_user_id on public.admin_payments(admin_user_id);
