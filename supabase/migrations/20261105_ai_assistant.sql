-- Shared AI Assistant (Google Gemini) — settings, organization quotas, usage ledger,
-- conversations, and the RAG knowledge base (pgvector).
-- Safe to re-run. Rollback: supabase/migrations/rollback/20261105_ai_assistant_down.sql
--
-- Tenancy model (matches the existing schema):
--   tenant_id        = the user's own tenant (central org or branch)
--   organization_id  = the billing organization (central tenant; equals tenant_id for standalone/central)
-- Every AI table is written only by server routes using the service-role key after their own
-- authorization checks. RLS is enabled everywhere so the anon/authenticated keys cannot read
-- other users' data directly.

SET search_path = public, extensions;

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Global provider settings (single row). The Gemini API key is NOT stored here —
-- it lives only in the server environment (GEMINI_API_KEY).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  provider text NOT NULL DEFAULT 'gemini',
  model text NOT NULL DEFAULT 'gemini-2.5-flash',
  embedding_model text NOT NULL DEFAULT 'gemini-embedding-001',
  temperature numeric NOT NULL DEFAULT 0.2 CHECK (temperature >= 0 AND temperature <= 2),
  max_output_tokens integer NOT NULL DEFAULT 1500 CHECK (max_output_tokens BETWEEN 64 AND 8192),
  request_timeout_ms integer NOT NULL DEFAULT 30000 CHECK (request_timeout_ms BETWEEN 2000 AND 120000),
  thinking_budget integer DEFAULT 0 CHECK (thinking_budget IS NULL OR thinking_budget BETWEEN 0 AND 24576),
  capabilities jsonb NOT NULL DEFAULT '{"platform_support": true, "business_data": true, "knowledge_base": true}'::jsonb,
  retention_days integer NOT NULL DEFAULT 180 CHECK (retention_days BETWEEN 1 AND 3650),
  max_input_chars integer NOT NULL DEFAULT 4000 CHECK (max_input_chars BETWEEN 200 AND 20000),
  history_messages integer NOT NULL DEFAULT 10 CHECK (history_messages BETWEEN 0 AND 40),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ai_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Plan limits (keyed by tenants.plan / business_plans.slug). NULL limit = no cap.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_plan_limits (
  plan_slug text PRIMARY KEY,
  label text NOT NULL,
  monthly_limit integer CHECK (monthly_limit IS NULL OR monthly_limit >= 0),
  daily_limit integer CHECK (daily_limit IS NULL OR daily_limit >= 0),
  per_minute_limit integer CHECK (per_minute_limit IS NULL OR per_minute_limit >= 0),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ai_plan_limits (plan_slug, label, monthly_limit, daily_limit, per_minute_limit)
VALUES
  ('default', 'Default (unknown plan)', 100, 20, 5),
  ('free_trial', 'Free Trial', 50, 10, 5),
  ('trial', 'Trial', 50, 10, 5),
  ('basic', 'Basic', 500, 30, 10),
  ('standard', 'Standard', 500, 30, 10),
  ('professional', 'Professional', 2000, 100, 20),
  ('enterprise', 'Enterprise', 10000, 500, 30)
ON CONFLICT (plan_slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Organization-level AI settings (Super Admin controls limits/modules;
-- the organization admin controls org_enabled when permitted, and allowed_roles).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_tenant_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  org_admin_can_toggle boolean NOT NULL DEFAULT true,
  org_enabled boolean NOT NULL DEFAULT true,
  monthly_limit integer CHECK (monthly_limit IS NULL OR monthly_limit >= 0),
  daily_limit integer CHECK (daily_limit IS NULL OR daily_limit >= 0),
  per_minute_limit integer CHECK (per_minute_limit IS NULL OR per_minute_limit >= 0),
  allowed_modules text[] NOT NULL DEFAULT ARRAY[
    'platform_support', 'academic', 'admissions', 'finance', 'payroll', 'hr', 'inventory', 'reports'
  ]::text[],
  allowed_roles text[],
  warning_threshold numeric NOT NULL DEFAULT 0.8 CHECK (warning_threshold > 0 AND warning_threshold <= 1),
  notes text,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Provider pricing (per million tokens). Super Admin keeps this current;
-- business logic never hardcodes prices.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_model_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'gemini',
  model text NOT NULL,
  input_per_million numeric(12,6) NOT NULL DEFAULT 0 CHECK (input_per_million >= 0),
  output_per_million numeric(12,6) NOT NULL DEFAULT 0 CHECK (output_per_million >= 0),
  currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_model_pricing_provider_model_unique UNIQUE (provider, model)
);

-- Initial values only — verify against current Google pricing and edit in Super Admin → AI Management.
INSERT INTO public.ai_model_pricing (provider, model, input_per_million, output_per_million)
VALUES
  ('gemini', 'gemini-2.5-flash', 0.30, 2.50),
  ('gemini', 'gemini-2.5-flash-lite', 0.10, 0.40),
  ('gemini', 'gemini-2.5-pro', 1.25, 10.00),
  ('gemini', 'gemini-embedding-001', 0.15, 0)
ON CONFLICT (provider, model) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Conversations & messages
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New conversation',
  context_type text,
  context_reference text,
  summary text,
  summary_message_count integer NOT NULL DEFAULT 0,
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user
  ON public.ai_conversations (user_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_conversations_tenant
  ON public.ai_conversations (tenant_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  response_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  feedback smallint CHECK (feedback IS NULL OR feedback IN (-1, 1)),
  feedback_comment text,
  feedback_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation
  ON public.ai_messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Usage ledger (one row per provider request). request_id is the idempotency key.
-- Rows with status 'reserved' are in flight; 'failed'/'rejected' never count toward quota.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  message_id uuid REFERENCES public.ai_messages(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'gemini',
  model text,
  request_type text NOT NULL DEFAULT 'chat'
    CHECK (request_type IN ('chat', 'summary', 'embedding', 'extraction', 'test')),
  module text,
  counts_toward_quota boolean NOT NULL DEFAULT true,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  estimated_cost numeric(14,6) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  duration_ms integer,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'success', 'failed', 'rejected')),
  error_category text,
  tools_used text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT ai_usage_logs_request_unique UNIQUE (request_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_org_created
  ON public.ai_usage_logs (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created
  ON public.ai_usage_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created
  ON public.ai_usage_logs (created_at DESC);

-- ---------------------------------------------------------------------------
-- Knowledge base. tenant_id NULL = global platform documentation (shared);
-- otherwise the organization (central tenant) that owns the private document.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_type text NOT NULL DEFAULT 'upload' CHECK (source_type IN ('upload', 'text', 'builtin')),
  file_name text,
  mime_type text,
  size_bytes integer,
  module text,
  language text,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  embedding_status text NOT NULL DEFAULT 'pending' CHECK (embedding_status IN ('pending', 'ready', 'failed')),
  chunk_count integer NOT NULL DEFAULT 0,
  error text,
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_documents_tenant
  ON public.ai_knowledge_documents (tenant_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.ai_knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.ai_knowledge_documents(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(768),
  token_estimate integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_chunks_document
  ON public.ai_knowledge_chunks (document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_chunks_tenant
  ON public.ai_knowledge_chunks (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_chunks_embedding
  ON public.ai_knowledge_chunks USING hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- Atomic quota reservation. Serialized per organization with an advisory lock so
-- simultaneous requests cannot exceed limits. Idempotent per request_id.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ai_reserve_quota(
  p_request_id text,
  p_tenant_id uuid,
  p_organization_id uuid,
  p_user_id uuid,
  p_conversation_id uuid,
  p_module text,
  p_provider text,
  p_model text,
  p_daily_limit integer,
  p_monthly_limit integer,
  p_minute_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.ai_usage_logs%ROWTYPE;
  v_daily integer := 0;
  v_monthly integer := 0;
  v_minute integer := 0;
  v_id uuid;
BEGIN
  SELECT * INTO v_existing FROM public.ai_usage_logs WHERE request_id = p_request_id;
  IF FOUND THEN
    IF v_existing.user_id IS DISTINCT FROM p_user_id THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'duplicate_request');
    END IF;
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'duplicate_request',
      'status', v_existing.status, 'id', v_existing.id, 'message_id', v_existing.message_id
    );
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('ai_quota:' || coalesce(p_organization_id::text, 'user:' || p_user_id::text), 0)
  );

  IF p_organization_id IS NOT NULL THEN
    SELECT
      count(*) FILTER (WHERE created_at >= date_trunc('day', now())),
      count(*)
    INTO v_daily, v_monthly
    FROM public.ai_usage_logs
    WHERE organization_id = p_organization_id
      AND counts_toward_quota
      AND created_at >= date_trunc('month', now())
      AND (status = 'success' OR (status = 'reserved' AND created_at > now() - interval '10 minutes'));
  END IF;

  SELECT count(*) INTO v_minute
  FROM public.ai_usage_logs
  WHERE user_id = p_user_id
    AND counts_toward_quota
    AND created_at > now() - interval '1 minute'
    AND status IN ('reserved', 'success', 'failed');

  IF p_minute_limit IS NOT NULL AND v_minute >= p_minute_limit THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'rate_limited');
  END IF;
  IF p_daily_limit IS NOT NULL AND v_daily >= p_daily_limit THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'daily_quota_exceeded',
      'daily_used', v_daily, 'monthly_used', v_monthly);
  END IF;
  IF p_monthly_limit IS NOT NULL AND v_monthly >= p_monthly_limit THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'monthly_quota_exceeded',
      'daily_used', v_daily, 'monthly_used', v_monthly);
  END IF;

  INSERT INTO public.ai_usage_logs (
    request_id, tenant_id, organization_id, user_id, conversation_id,
    provider, model, request_type, module, counts_toward_quota, status
  ) VALUES (
    p_request_id, p_tenant_id, p_organization_id, p_user_id, p_conversation_id,
    coalesce(p_provider, 'gemini'), p_model, 'chat', p_module, true, 'reserved'
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok', true, 'id', v_id,
    'daily_used', v_daily + 1, 'monthly_used', v_monthly + 1
  );
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', false, 'reason', 'duplicate_request');
END;
$$;

-- ---------------------------------------------------------------------------
-- Tenant-filtered semantic search. The organization id is always supplied by the
-- server from the authenticated context — never by the model or the browser.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ai_match_knowledge(
  query_embedding vector(768),
  p_organization_id uuid,
  p_match_count integer DEFAULT 5
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  title text,
  module text,
  tenant_id uuid,
  content text,
  similarity double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    c.id, c.document_id, d.title, d.module, c.tenant_id, c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.ai_knowledge_chunks c
  JOIN public.ai_knowledge_documents d ON d.id = c.document_id
  WHERE d.status = 'ready'
    AND d.deleted_at IS NULL
    AND c.embedding IS NOT NULL
    AND (c.tenant_id IS NULL OR (p_organization_id IS NOT NULL AND c.tenant_id = p_organization_id))
  ORDER BY c.embedding <=> query_embedding
  LIMIT least(greatest(coalesce(p_match_count, 5), 1), 20);
$$;

-- ---------------------------------------------------------------------------
-- Retention: hard-delete conversations idle longer than ai_settings.retention_days,
-- and soft-deleted conversations older than 7 days.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ai_apply_retention()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer;
  v_deleted integer;
BEGIN
  SELECT retention_days INTO v_days FROM public.ai_settings WHERE id = 1;
  v_days := coalesce(v_days, 180);
  DELETE FROM public.ai_conversations
  WHERE updated_at < now() - make_interval(days => v_days)
     OR (deleted_at IS NOT NULL AND deleted_at < now() - interval '7 days');
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.ai_reserve_quota(text, uuid, uuid, uuid, uuid, text, text, text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_match_knowledge(vector, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_apply_retention() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_reserve_quota(text, uuid, uuid, uuid, uuid, text, text, text, integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_match_knowledge(vector, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_apply_retention() TO service_role;

-- ---------------------------------------------------------------------------
-- RLS: owners may read their own conversations/messages; everything else is
-- server-only (service role bypasses RLS after route-level authorization).
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ai_settings', 'ai_plan_limits', 'ai_tenant_settings', 'ai_model_pricing',
    'ai_conversations', 'ai_messages', 'ai_usage_logs',
    'ai_knowledge_documents', 'ai_knowledge_chunks'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS ai_conversations_select_own ON public.ai_conversations;
CREATE POLICY ai_conversations_select_own ON public.ai_conversations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS ai_messages_select_own ON public.ai_messages;
CREATE POLICY ai_messages_select_own ON public.ai_messages
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
