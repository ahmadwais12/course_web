-- Portable catalog: student levels used on Create Student & Parent.

CREATE TABLE IF NOT EXISTS public.student_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  sort_order integer DEFAULT 0,
  status text DEFAULT 'active',
  is_active boolean DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_levels_deleted_at
  ON public.student_levels (deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_levels_sort
  ON public.student_levels (sort_order, name);

INSERT INTO public.student_levels (name, slug, description, sort_order, status, is_active)
VALUES
  ('Beginner', 'beginner', 'Starting level for new learners', 10, 'active', true),
  ('Elementary', 'elementary', 'Basic foundation after beginner', 20, 'active', true),
  ('Intermediate', 'intermediate', 'Mid-level progressing students', 30, 'active', true),
  ('Upper Intermediate', 'upper-intermediate', 'Advanced preparation level', 40, 'active', true),
  ('Advanced', 'advanced', 'High proficiency level', 50, 'active', true)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.student_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_levels_select_authenticated ON public.student_levels;
DROP POLICY IF EXISTS student_levels_insert_admins ON public.student_levels;
DROP POLICY IF EXISTS student_levels_update_admins ON public.student_levels;
DROP POLICY IF EXISTS student_levels_delete_admins ON public.student_levels;

CREATE POLICY student_levels_select_authenticated
  ON public.student_levels
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY student_levels_insert_admins
  ON public.student_levels
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

CREATE POLICY student_levels_update_admins
  ON public.student_levels
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

CREATE POLICY student_levels_delete_admins
  ON public.student_levels
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
