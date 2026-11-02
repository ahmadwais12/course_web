CREATE TABLE IF NOT EXISTS public.business_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  status text DEFAULT 'active',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.business_types (name, slug, description, status, is_active)
VALUES
  ('School', 'school', 'Primary or secondary school', 'active', true),
  ('Academy', 'academy', 'Training academy or coaching center', 'active', true),
  ('Institute', 'institute', 'Educational institute', 'active', true),
  ('Company', 'company', 'Company or corporate training', 'active', true),
  ('Training Center', 'training-center', 'Skills and vocational training', 'active', true)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.business_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_types_select_authenticated ON public.business_types;
DROP POLICY IF EXISTS business_types_insert_admins ON public.business_types;
DROP POLICY IF EXISTS business_types_update_admins ON public.business_types;
DROP POLICY IF EXISTS business_types_delete_admins ON public.business_types;

CREATE POLICY business_types_select_authenticated
  ON public.business_types
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY business_types_insert_admins
  ON public.business_types
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

CREATE POLICY business_types_update_admins
  ON public.business_types
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

CREATE POLICY business_types_delete_admins
  ON public.business_types
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
