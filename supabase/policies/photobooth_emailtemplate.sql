-- Active la sécurité RLS
ALTER TABLE public.photobooth_emailtemplate ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.photobooth_emailtemplate
  ADD COLUMN IF NOT EXISTS created_by_admin uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'photobooth_emailtemplate_created_by_admin_fkey'
      AND table_name = 'photobooth_emailtemplate'
  ) THEN
    ALTER TABLE public.photobooth_emailtemplate
      ADD CONSTRAINT photobooth_emailtemplate_created_by_admin_fkey
      FOREIGN KEY (created_by_admin) REFERENCES admin_users(id) ON DELETE SET NULL;
  END IF;
END$$;

-- Pour debug maximal, ouvre TOUT (SELECT, INSERT, UPDATE, DELETE) à tout le monde pour vérifier si le problème vient bien des policies.
DROP POLICY IF EXISTS "Select own email templates" ON public.photobooth_emailtemplate;
CREATE POLICY "Select all email templates"
  ON public.photobooth_emailtemplate
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Insert email template for own project" ON public.photobooth_emailtemplate;
DROP POLICY IF EXISTS "Insert email template for anyone" ON public.photobooth_emailtemplate;
CREATE POLICY "Insert email template for anyone"
  ON public.photobooth_emailtemplate
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Update own email templates" ON public.photobooth_emailtemplate;
CREATE POLICY "Update any email template"
  ON public.photobooth_emailtemplate
  FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Delete own email templates" ON public.photobooth_emailtemplate;
CREATE POLICY "Delete any email template"
  ON public.photobooth_emailtemplate
  FOR DELETE
  USING (true);
  


CREATE POLICY "Delete own email templates"
  ON public.photobooth_emailtemplate
  FOR DELETE
  USING (
    created_by_admin = (current_setting('request.jwt.claims', true)::json->>'admin_id')::uuid
  );

