-- Soft delete columns + trash index for Logs / Trash pages.
-- Safe to re-run. Tables that are not in this database (e.g. permissions, roles)
-- are skipped; run this again after creating them to add soft-delete support.

CREATE TABLE IF NOT EXISTS public.trash_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  table_name text NOT NULL,
  display_name text,
  snapshot jsonb,
  deleted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trash_index_entity_unique UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_trash_index_deleted_at ON public.trash_index (deleted_at DESC);

ALTER TABLE public.trash_index ENABLE ROW LEVEL SECURITY;

-- Soft-delete columns on first-wave entities (only tables that exist)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tenants', 'users', 'business_types', 'business_plans',
    'messaging_types', 'student_levels', 'roles', 'permissions'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Skipping soft delete for %: table does not exist', t;
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I
         ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
         ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.users(id)',
      t
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (deleted_at) WHERE deleted_at IS NOT NULL',
      'idx_' || t || '_deleted_at',
      t
    );
  END LOOP;
END $$;

-- Log tables: index + RLS only when present
DO $$
DECLARE
  t text;
BEGIN
  IF to_regclass('public.system_logs') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'system_logs' AND column_name = 'created_at'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs (created_at DESC);
    END IF;

    IF (
      SELECT count(*) FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'system_logs'
        AND column_name IN ('entity_type', 'entity_id')
    ) = 2 THEN
      CREATE INDEX IF NOT EXISTS idx_system_logs_entity ON public.system_logs (entity_type, entity_id);
    END IF;
  END IF;

  FOREACH t IN ARRAY ARRAY['system_logs', 'audit_log', 'record_history']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    ELSE
      RAISE NOTICE 'Skipping RLS for %: table does not exist', t;
    END IF;
  END LOOP;
END $$;
