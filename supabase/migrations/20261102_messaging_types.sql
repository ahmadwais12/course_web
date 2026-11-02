CREATE TABLE IF NOT EXISTS public.messaging_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  status text DEFAULT 'active',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.messaging_types (name, slug, description, status, is_active)
VALUES
  ('Direct', 'direct', 'One-to-one private conversation', 'active', true),
  ('Group', 'group', 'Multi-person group chat', 'active', true),
  ('Channel', 'channel', 'Broadcast channel for a team or department', 'active', true),
  ('Announcement', 'announcement', 'One-way announcements to many people', 'active', true),
  ('Support', 'support', 'Support or helpdesk conversation', 'active', true)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.messaging_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messaging_types_select_authenticated ON public.messaging_types;
DROP POLICY IF EXISTS messaging_types_insert_admins ON public.messaging_types;
DROP POLICY IF EXISTS messaging_types_update_admins ON public.messaging_types;
DROP POLICY IF EXISTS messaging_types_delete_admins ON public.messaging_types;

CREATE POLICY messaging_types_select_authenticated
  ON public.messaging_types
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY messaging_types_insert_admins
  ON public.messaging_types
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

CREATE POLICY messaging_types_update_admins
  ON public.messaging_types
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

CREATE POLICY messaging_types_delete_admins
  ON public.messaging_types
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
