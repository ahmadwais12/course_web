import type { SupabaseClient } from '@supabase/supabase-js';
import { AIError, isMissingTableError } from '@/lib/ai/errors';
import { estimateCost, type PricingRow, type QuotaLimits, type ReserveReason } from '@/lib/ai/quota';
import type { AIRequestContext } from '@/lib/ai/types';

export type ReserveResult =
  | { ok: true; usageId: string; dailyUsed: number; monthlyUsed: number }
  | {
      ok: false;
      reason: ReserveReason;
      existingStatus?: string;
      existingMessageId?: string | null;
      dailyUsed?: number;
      monthlyUsed?: number;
    };

/** Atomic, idempotent quota reservation (see `ai_reserve_quota` in the migration). */
export async function reserveQuota(
  admin: SupabaseClient,
  ctx: AIRequestContext,
  input: {
    requestId: string;
    conversationId: string | null;
    module: string | null;
    provider: string;
    model: string;
    limits: QuotaLimits;
  }
): Promise<ReserveResult> {
  const { data, error } = await admin.rpc('ai_reserve_quota', {
    p_request_id: input.requestId,
    p_tenant_id: ctx.tenantId,
    p_organization_id: ctx.organizationId,
    p_user_id: ctx.userId,
    p_conversation_id: input.conversationId,
    p_module: input.module,
    p_provider: input.provider,
    p_model: input.model,
    p_daily_limit: input.limits.daily,
    p_monthly_limit: input.limits.monthly,
    p_minute_limit: input.limits.perMinute,
  });
  if (error) {
    if (isMissingTableError(error)) throw new AIError('ai_tables_missing', error.message);
    throw new AIError('internal', `reserve quota: ${error.message}`);
  }
  const res = (data ?? {}) as Record<string, unknown>;
  if (res.ok === true) {
    return {
      ok: true,
      usageId: String(res.id),
      dailyUsed: Number(res.daily_used ?? 0),
      monthlyUsed: Number(res.monthly_used ?? 0),
    };
  }
  return {
    ok: false,
    reason: (res.reason as ReserveReason) || 'duplicate_request',
    existingStatus: typeof res.status === 'string' ? res.status : undefined,
    existingMessageId: (res.message_id as string | null | undefined) ?? null,
    dailyUsed: res.daily_used === undefined ? undefined : Number(res.daily_used),
    monthlyUsed: res.monthly_used === undefined ? undefined : Number(res.monthly_used),
  };
}

export async function completeUsage(
  admin: SupabaseClient,
  usageId: string,
  input: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    messageId: string | null;
    conversationId: string | null;
    module: string | null;
    toolsUsed: string[];
    pricing: PricingRow[];
  }
) {
  const cost = estimateCost(input.pricing, input.provider, input.model, input.inputTokens, input.outputTokens);
  const { error } = await admin
    .from('ai_usage_logs')
    .update({
      status: 'success',
      model: input.model,
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      total_tokens: input.inputTokens + input.outputTokens,
      estimated_cost: cost.cost,
      currency: cost.currency,
      duration_ms: input.durationMs,
      message_id: input.messageId,
      conversation_id: input.conversationId,
      module: input.module,
      tools_used: input.toolsUsed.length ? input.toolsUsed : null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', usageId);
  if (error) console.error('[ai] completeUsage failed:', error.message);
}

/** Failed requests stay in the ledger for monitoring but never count toward quota. */
export async function failUsage(
  admin: SupabaseClient,
  usageId: string,
  input: { errorCategory: string; durationMs: number; inputTokens?: number; outputTokens?: number; pricing?: PricingRow[]; provider?: string; model?: string }
) {
  const inputTokens = input.inputTokens ?? 0;
  const outputTokens = input.outputTokens ?? 0;
  const cost =
    input.pricing && input.provider && input.model
      ? estimateCost(input.pricing, input.provider, input.model, inputTokens, outputTokens)
      : { cost: 0, currency: 'USD' };
  const { error } = await admin
    .from('ai_usage_logs')
    .update({
      status: 'failed',
      error_category: input.errorCategory.slice(0, 60),
      duration_ms: input.durationMs,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      estimated_cost: cost.cost,
      currency: cost.currency,
      completed_at: new Date().toISOString(),
    })
    .eq('id', usageId);
  if (error) console.error('[ai] failUsage failed:', error.message);
}

/** Summaries, embeddings, extraction, and connection tests: logged for cost, excluded from quota. */
export async function logAuxUsage(
  admin: SupabaseClient,
  input: {
    requestType: 'summary' | 'embedding' | 'extraction' | 'test';
    tenantId: string | null;
    organizationId: string | null;
    userId: string | null;
    conversationId?: string | null;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    status: 'success' | 'failed';
    errorCategory?: string | null;
    pricing: PricingRow[];
  }
) {
  const cost = estimateCost(input.pricing, input.provider, input.model, input.inputTokens, input.outputTokens);
  const { error } = await admin.from('ai_usage_logs').insert({
    request_id: `${input.requestType}-${crypto.randomUUID()}`,
    tenant_id: input.tenantId,
    organization_id: input.organizationId,
    user_id: input.userId,
    conversation_id: input.conversationId ?? null,
    provider: input.provider,
    model: input.model,
    request_type: input.requestType,
    counts_toward_quota: false,
    input_tokens: input.inputTokens,
    output_tokens: input.outputTokens,
    total_tokens: input.inputTokens + input.outputTokens,
    estimated_cost: cost.cost,
    currency: cost.currency,
    duration_ms: input.durationMs,
    status: input.status,
    error_category: input.errorCategory ?? null,
    completed_at: new Date().toISOString(),
  });
  if (error) console.error('[ai] logAuxUsage failed:', error.message);
}

/** Quota-counted usage so far (same rules as the reservation function, which uses UTC day/month). */
export async function getUsageCounts(admin: SupabaseClient, organizationId: string | null) {
  if (!organizationId) return { daily: 0, monthly: 0 };
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const staleCutoff = new Date(Date.now() - 10 * 60_000).toISOString();
  const base = () =>
    admin
      .from('ai_usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('counts_toward_quota', true)
      .or(`status.eq.success,and(status.eq.reserved,created_at.gt.${staleCutoff})`);
  const [monthly, daily] = await Promise.all([base().gte('created_at', monthStart), base().gte('created_at', dayStart)]);
  if (monthly.error) {
    if (isMissingTableError(monthly.error)) throw new AIError('ai_tables_missing', monthly.error.message);
    throw new AIError('internal', monthly.error.message);
  }
  return { daily: daily.count ?? 0, monthly: monthly.count ?? 0 };
}
