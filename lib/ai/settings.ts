import type { SupabaseClient } from '@supabase/supabase-js';
import { AIError, isMissingTableError } from '@/lib/ai/errors';
import { AI_MODULES } from '@/lib/ai/modules';
import { DEFAULT_PLAN_LIMIT, type PlanLimitRow, type PricingRow } from '@/lib/ai/quota';

export type AICapabilities = {
  platform_support: boolean;
  business_data: boolean;
  knowledge_base: boolean;
};

export type AIGlobalSettings = {
  enabled: boolean;
  provider: string;
  model: string;
  embedding_model: string;
  temperature: number;
  max_output_tokens: number;
  request_timeout_ms: number;
  thinking_budget: number | null;
  capabilities: AICapabilities;
  retention_days: number;
  max_input_chars: number;
  history_messages: number;
  updated_at: string | null;
};

export type AITenantSettings = {
  tenant_id: string;
  enabled: boolean;
  org_admin_can_toggle: boolean;
  org_enabled: boolean;
  monthly_limit: number | null;
  daily_limit: number | null;
  per_minute_limit: number | null;
  allowed_modules: string[];
  allowed_roles: string[] | null;
  warning_threshold: number;
  notes: string | null;
  updated_at: string | null;
};

export const EMBEDDING_DIMENSIONS = 768;

export const DEFAULT_GLOBAL_SETTINGS: AIGlobalSettings = {
  enabled: true,
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  embedding_model: 'gemini-embedding-001',
  temperature: 0.2,
  max_output_tokens: 1500,
  request_timeout_ms: 30000,
  thinking_budget: 0,
  capabilities: { platform_support: true, business_data: true, knowledge_base: true },
  retention_days: 180,
  max_input_chars: 4000,
  history_messages: 10,
  updated_at: null,
};

export function defaultTenantSettings(tenantId: string): AITenantSettings {
  return {
    tenant_id: tenantId,
    enabled: true,
    org_admin_can_toggle: true,
    org_enabled: true,
    monthly_limit: null,
    daily_limit: null,
    per_minute_limit: null,
    allowed_modules: [...AI_MODULES],
    allowed_roles: null,
    warning_threshold: 0.8,
    notes: null,
    updated_at: null,
  };
}

function num(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeGlobalSettings(row: Record<string, unknown> | null): AIGlobalSettings {
  if (!row) return { ...DEFAULT_GLOBAL_SETTINGS };
  const caps = (row.capabilities ?? {}) as Partial<AICapabilities>;
  return {
    enabled: row.enabled !== false,
    provider: String(row.provider || DEFAULT_GLOBAL_SETTINGS.provider),
    model: String(row.model || DEFAULT_GLOBAL_SETTINGS.model),
    embedding_model: String(row.embedding_model || DEFAULT_GLOBAL_SETTINGS.embedding_model),
    temperature: num(row.temperature, DEFAULT_GLOBAL_SETTINGS.temperature),
    max_output_tokens: num(row.max_output_tokens, DEFAULT_GLOBAL_SETTINGS.max_output_tokens),
    request_timeout_ms: num(row.request_timeout_ms, DEFAULT_GLOBAL_SETTINGS.request_timeout_ms),
    thinking_budget:
      row.thinking_budget === null || row.thinking_budget === undefined ? null : num(row.thinking_budget, 0),
    capabilities: {
      platform_support: caps.platform_support !== false,
      business_data: caps.business_data !== false,
      knowledge_base: caps.knowledge_base !== false,
    },
    retention_days: num(row.retention_days, DEFAULT_GLOBAL_SETTINGS.retention_days),
    max_input_chars: num(row.max_input_chars, DEFAULT_GLOBAL_SETTINGS.max_input_chars),
    history_messages: num(row.history_messages, DEFAULT_GLOBAL_SETTINGS.history_messages),
    updated_at: (row.updated_at as string | null) ?? null,
  };
}

/** Throws ai_tables_missing when the migration has not been applied — callers surface a clear message. */
export async function loadGlobalSettings(admin: SupabaseClient): Promise<AIGlobalSettings> {
  const { data, error } = await admin.from('ai_settings').select('*').eq('id', 1).maybeSingle();
  if (error) {
    if (isMissingTableError(error)) throw new AIError('ai_tables_missing', error.message);
    throw new AIError('internal', error.message);
  }
  return normalizeGlobalSettings(data as Record<string, unknown> | null);
}

export function normalizeTenantSettings(tenantId: string, row: Record<string, unknown> | null): AITenantSettings {
  const base = defaultTenantSettings(tenantId);
  if (!row) return base;
  const nullableInt = (v: unknown) => (v === null || v === undefined || v === '' ? null : num(v, 0));
  return {
    tenant_id: tenantId,
    enabled: row.enabled !== false,
    org_admin_can_toggle: row.org_admin_can_toggle !== false,
    org_enabled: row.org_enabled !== false,
    monthly_limit: nullableInt(row.monthly_limit),
    daily_limit: nullableInt(row.daily_limit),
    per_minute_limit: nullableInt(row.per_minute_limit),
    allowed_modules: Array.isArray(row.allowed_modules) ? (row.allowed_modules as string[]) : base.allowed_modules,
    allowed_roles:
      Array.isArray(row.allowed_roles) && row.allowed_roles.length ? (row.allowed_roles as string[]) : null,
    warning_threshold: num(row.warning_threshold, 0.8),
    notes: (row.notes as string | null) ?? null,
    updated_at: (row.updated_at as string | null) ?? null,
  };
}

export async function loadTenantSettings(
  admin: SupabaseClient,
  organizationId: string | null
): Promise<AITenantSettings | null> {
  if (!organizationId) return null;
  const { data, error } = await admin
    .from('ai_tenant_settings')
    .select('*')
    .eq('tenant_id', organizationId)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) throw new AIError('ai_tables_missing', error.message);
    throw new AIError('internal', error.message);
  }
  return normalizeTenantSettings(organizationId, data as Record<string, unknown> | null);
}

export async function loadPlanLimits(admin: SupabaseClient): Promise<PlanLimitRow[]> {
  const { data, error } = await admin.from('ai_plan_limits').select('*').order('plan_slug');
  if (error) {
    if (isMissingTableError(error)) throw new AIError('ai_tables_missing', error.message);
    throw new AIError('internal', error.message);
  }
  const rows = (data ?? []) as PlanLimitRow[];
  return rows.length ? rows : [DEFAULT_PLAN_LIMIT];
}

export async function loadPricing(admin: SupabaseClient): Promise<PricingRow[]> {
  const { data, error } = await admin.from('ai_model_pricing').select('*').order('model');
  if (error) {
    if (isMissingTableError(error)) return [];
    throw new AIError('internal', error.message);
  }
  return (data ?? []) as PricingRow[];
}
