CREATE TABLE IF NOT EXISTS public.business_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  status text DEFAULT 'active',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.business_plans (name, slug, description, status, is_active)
VALUES
  ('Standard', 'standard', 'Default plan for new businesses', 'active', true),
  ('Pro', 'pro', 'More users and features', 'active', true),
  ('Enterprise', 'enterprise', 'Full platform access', 'active', true)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.business_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_plans_select_authenticated ON public.business_plans;
DROP POLICY IF EXISTS business_plans_insert_admins ON public.business_plans;
DROP POLICY IF EXISTS business_plans_update_admins ON public.business_plans;
DROP POLICY IF EXISTS business_plans_delete_admins ON public.business_plans;

CREATE POLICY business_plans_select_authenticated
  ON public.business_plans
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY business_plans_insert_admins
  ON public.business_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'admin', 'ceo')
        AND coalesce(users.is_active, true)
    )
  );

CREATE POLICY business_plans_update_admins
  ON public.business_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'admin', 'ceo')
        AND coalesce(users.is_active, true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'admin', 'ceo')
        AND coalesce(users.is_active, true)
    )
  );

CREATE POLICY business_plans_delete_admins
  ON public.business_plans
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'admin', 'ceo')
        AND coalesce(users.is_active, true)
    )
  );
