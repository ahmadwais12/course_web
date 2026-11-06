-- Account deletion requests — public "delete my account" form (app-store requirement)
-- plus the admin review queue at /users/deletion-requests.
-- Idempotent: safe to re-run in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nid bigserial UNIQUE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  full_name text,
  email text NOT NULL,
  phone text,
  reason text,
  source text NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'app', 'admin')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'rejected', 'completed', 'cancelled')),
  admin_note text,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_created_at
  ON public.account_deletion_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_status
  ON public.account_deletion_requests (status);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_id
  ON public.account_deletion_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_tenant_id
  ON public.account_deletion_requests (tenant_id);

-- One open request per email address.
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_deletion_requests_one_pending
  ON public.account_deletion_requests (lower(email))
  WHERE status = 'pending';

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Writes go through the service-role API routes. Signed-in users may read their own requests.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'account_deletion_requests'
      AND policyname = 'account_deletion_requests_select_own'
  ) THEN
    CREATE POLICY account_deletion_requests_select_own
      ON public.account_deletion_requests
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
