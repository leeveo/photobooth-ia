-- Enable RLS
alter table public.admin_payments enable row level security;

-- Policy: Un utilisateur peut voir ses propres paiements
-- create policy "Allow user to view own payments"
-- on public.admin_payments
-- for select
-- using (auth.uid()::uuid = admin_user_id);

-- Policy: Un utilisateur peut insérer un paiement pour lui-même (optionnel, sinon réservé au backend)
-- create policy "Allow user to insert own payment"
-- on public.admin_payments
-- for insert
-- with check (auth.uid()::uuid = admin_user_id);

-- Policy: Un utilisateur peut mettre à jour ses propres paiements (optionnel, sinon réservé au backend)
-- create policy "Allow user to update own payment"
-- on public.admin_payments
-- for update
-- using (auth.uid()::uuid = admin_user_id);

-- Autorise le service role à tout faire (clé utilisée côté serveur)
create policy "Service role full access"
on public.admin_payments
for all
to service_role
using (true)
with check (true);
