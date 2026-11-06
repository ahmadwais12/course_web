-- Rollback for 20261105_ai_assistant.sql — removes every AI table and function.
-- Destroys AI conversations, usage history, and knowledge documents. The pgvector
-- extension is left installed because other features may depend on it.

DROP FUNCTION IF EXISTS public.ai_apply_retention();
DROP FUNCTION IF EXISTS public.ai_match_knowledge(vector, uuid, integer);
DROP FUNCTION IF EXISTS public.ai_reserve_quota(text, uuid, uuid, uuid, uuid, text, text, text, integer, integer, integer);

DROP TABLE IF EXISTS public.ai_knowledge_chunks;
DROP TABLE IF EXISTS public.ai_knowledge_documents;
DROP TABLE IF EXISTS public.ai_usage_logs;
DROP TABLE IF EXISTS public.ai_messages;
DROP TABLE IF EXISTS public.ai_conversations;
DROP TABLE IF EXISTS public.ai_model_pricing;
DROP TABLE IF EXISTS public.ai_tenant_settings;
DROP TABLE IF EXISTS public.ai_plan_limits;
DROP TABLE IF EXISTS public.ai_settings;

NOTIFY pgrst, 'reload schema';
