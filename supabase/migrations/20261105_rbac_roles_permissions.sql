-- Roles & permissions (KMS / Spatie-style) used by /users/roles, /users/permissions,
-- /api/abilities and user role assignment. Safe to re-run.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  guard_name text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.users(id),
  CONSTRAINT permissions_name_guard_unique UNIQUE (name, guard_name)
);

CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  guard_name text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.users(id)
);

-- An older roles table may already exist without these columns
ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS guard_name text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.users(id);

UPDATE public.roles
SET slug = lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '_', 'g'))
WHERE slug IS NULL OR slug = '';

DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS roles_slug_guard_unique
    ON public.roles (slug, guard_name)
    WHERE deleted_at IS NULL;
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'roles has duplicate slugs; skipped roles_slug_guard_unique';
END $$;

CREATE TABLE IF NOT EXISTS public.role_has_permissions (
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_has_permissions_permission
  ON public.role_has_permissions (permission_id);

CREATE TABLE IF NOT EXISTS public.model_has_roles (
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  model_type text NOT NULL DEFAULT 'user',
  model_id uuid NOT NULL,
  PRIMARY KEY (role_id, model_type, model_id)
);

CREATE INDEX IF NOT EXISTS idx_model_has_roles_model
  ON public.model_has_roles (model_id, model_type);

CREATE INDEX IF NOT EXISTS idx_permissions_deleted_at
  ON public.permissions (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_roles_deleted_at
  ON public.roles (deleted_at) WHERE deleted_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Seed data (matches EMIS_PERMISSIONS in lib/rbac.ts and SYSTEM_ROLES in lib/roles.ts)
-- ---------------------------------------------------------------------------

INSERT INTO public.permissions (name, guard_name)
SELECT p, 'web'
FROM unnest(ARRAY[
  'Team', 'Dashboard', 'Students', 'Teachers', 'Courses', 'Attendance', 'Exams',
  'Payments', 'Salaries', 'Reports', 'Books', 'Feedback', 'Settings',
  'User Management', 'Roles', 'Permissions', 'System Logs', 'Trash',
  'Create Users', 'Add Students', 'Edit Students', 'Delete Students',
  'Add Courses', 'Edit Courses', 'Delete Courses',
  'Add Payments', 'Edit Payments', 'Delete Payments'
]) AS p
ON CONFLICT (name, guard_name) DO NOTHING;

INSERT INTO public.roles (name, slug, guard_name)
SELECT r.name, r.slug, 'web'
FROM (VALUES
  ('CEO', 'ceo'),
  ('Super Admin', 'super_admin'),
  ('Admin', 'admin'),
  ('Branch Manager', 'branch_manager'),
  ('Teacher', 'teacher'),
  ('Student', 'student'),
  ('Guardian', 'guardian'),
  ('Staff', 'staff'),
  ('Academic Support', 'academic_support'),
  ('Accountant', 'accountant'),
  ('Cashier', 'cashier'),
  ('Librarian', 'librarian'),
  ('Receptionist', 'receptionist'),
  ('HR Manager', 'hr_manager'),
  ('Inventory Manager', 'inventory_manager'),
  ('IT Support', 'it_support'),
  ('Maintenance', 'maintenance'),
  ('Event Manager', 'event_manager'),
  ('Complaint Manager', 'complaint_manager')
) AS r(name, slug)
WHERE NOT EXISTS (
  SELECT 1 FROM public.roles x WHERE x.slug = r.slug AND x.guard_name = 'web'
);

-- CEO and Super Admin get every permission
INSERT INTO public.role_has_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.slug IN ('ceo', 'super_admin')
  AND r.guard_name = 'web'
  AND p.guard_name = 'web'
ON CONFLICT DO NOTHING;

-- Link existing users to the role named in users.role
INSERT INTO public.model_has_roles (role_id, model_type, model_id)
SELECT r.id, 'user', u.id
FROM public.users u
JOIN public.roles r ON r.slug = u.role AND r.guard_name = 'web'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- RLS: signed-in users can read; super_admin / admin / ceo can write
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rbac_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin', 'ceo')
      AND coalesce(users.is_active, true)
  );
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['permissions', 'roles', 'role_has_permissions', 'model_has_roles']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert_admins', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update_admins', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete_admins', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      t || '_select_authenticated', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.rbac_is_admin())',
      t || '_insert_admins', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.rbac_is_admin()) WITH CHECK (public.rbac_is_admin())',
      t || '_update_admins', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.rbac_is_admin())',
      t || '_delete_admins', t
    );
  END LOOP;
END $$;

-- Refresh PostgREST so the API sees the new tables immediately
NOTIFY pgrst, 'reload schema';
