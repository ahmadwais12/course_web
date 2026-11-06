-- Portable catalog: course/program durations used on Create Student & Parent.

CREATE TABLE IF NOT EXISTS public.durations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  months integer NOT NULL CHECK (months > 0),
  description text,
  sort_order integer DEFAULT 0,
  status text DEFAULT 'active',
  is_active boolean DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_durations_deleted_at
  ON public.durations (deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_durations_sort
  ON public.durations (sort_order, months);

INSERT INTO public.durations (name, slug, months, description, sort_order, status, is_active)
VALUES
  ('4 Months', '4-months', 4, 'Short program duration', 10, 'active', true),
  ('6 Months', '6-months', 6, 'Standard program duration', 20, 'active', true),
  ('12 Months', '12-months', 12, 'Full-year program duration', 30, 'active', true)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.durations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS durations_select_authenticated ON public.durations;
DROP POLICY IF EXISTS durations_insert_admins ON public.durations;
DROP POLICY IF EXISTS durations_update_admins ON public.durations;
DROP POLICY IF EXISTS durations_delete_admins ON public.durations;

CREATE POLICY durations_select_authenticated
  ON public.durations FOR SELECT TO authenticated USING (true);

CREATE POLICY durations_insert_admins
  ON public.durations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'admin', 'ceo')
        AND coalesce(users.is_active, true)
    )
  );

CREATE POLICY durations_update_admins
  ON public.durations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'admin', 'ceo')
        AND coalesce(users.is_active, true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'admin', 'ceo')
        AND coalesce(users.is_active, true)
    )
  );

CREATE POLICY durations_delete_admins
  ON public.durations FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin', 'admin', 'ceo')
        AND coalesce(users.is_active, true)
    )
  );
