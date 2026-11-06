-- Login History — sign-in / sign-out / failed attempts by user, device, and IP.
-- Idempotent: safe to re-run in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nid bigserial UNIQUE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  email text,
  event_type text NOT NULL CHECK (event_type IN ('login', 'logout', 'failed_login')),
  success boolean NOT NULL DEFAULT true,
  ip_address text,
  user_agent text,
  device_type text,
  device_name text,
  browser text,
  os text,
  location text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON public.login_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history (user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_email ON public.login_history (email);
CREATE INDEX IF NOT EXISTS idx_login_history_event_type ON public.login_history (event_type);
CREATE INDEX IF NOT EXISTS idx_login_history_tenant_id ON public.login_history (tenant_id);
CREATE INDEX IF NOT EXISTS idx_login_history_ip ON public.login_history (ip_address);

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'login_history' AND policyname = 'login_history_select_authenticated'
  ) THEN
    CREATE POLICY login_history_select_authenticated
      ON public.login_history
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'login_history' AND policyname = 'login_history_insert_authenticated'
  ) THEN
    -- Inserts go through the service-role API routes; authenticated clients may also insert own rows.
    CREATE POLICY login_history_insert_authenticated
      ON public.login_history
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id IS NULL OR user_id = auth.uid());
  END IF;
END $$;
