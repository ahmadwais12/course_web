/** Pure quota / pricing helpers (DB access lives in `lib/ai/usage.ts`). */

export type PlanLimitRow = {
  plan_slug: string;
  label?: string | null;
  monthly_limit: number | null;
  daily_limit: number | null;
  per_minute_limit: number | null;
};

export type TenantLimitOverrides = {
  monthly_limit?: number | null;
  daily_limit?: number | null;
  per_minute_limit?: number | null;
};

export type QuotaLimits = {
  daily: number | null;
  monthly: number | null;
  perMinute: number | null;
  planSlug: string;
};

export const DEFAULT_PLAN_LIMIT: PlanLimitRow = {
  plan_slug: 'default',
  label: 'Default',
  monthly_limit: 100,
  daily_limit: 20,
  per_minute_limit: 5,
};

/** Organization override > plan limit > default plan limit. */
export function resolveEffectiveLimits(
  planSlug: string | null | undefined,
  plans: PlanLimitRow[],
  overrides?: TenantLimitOverrides | null
): QuotaLimits {
  const slug = (planSlug || '').trim().toLowerCase();
  const plan =
    plans.find((p) => p.plan_slug === slug) ??
    plans.find((p) => p.plan_slug === 'default') ??
    DEFAULT_PLAN_LIMIT;
  const pick = (override: number | null | undefined, base: number | null) =>
    override === null || override === undefined ? base : override;
  return {
    daily: pick(overrides?.daily_limit, plan.daily_limit),
    monthly: pick(overrides?.monthly_limit, plan.monthly_limit),
    perMinute: pick(overrides?.per_minute_limit, plan.per_minute_limit),
    planSlug: plan.plan_slug,
  };
}

export type PricingRow = {
  provider: string;
  model: string;
  input_per_million: number | string;
  output_per_million: number | string;
  currency?: string | null;
  is_active?: boolean | null;
};

/** Exact model match first, then the longest configured prefix (e.g. `gemini-2.5-flash` for `gemini-2.5-flash-001`). */
export function findPricing(rows: PricingRow[], provider: string, model: string): PricingRow | null {
  const active = rows.filter((r) => r.provider === provider && r.is_active !== false);
  const exact = active.find((r) => r.model === model);
  if (exact) return exact;
  return (
    active
      .filter((r) => model.startsWith(r.model))
      .sort((a, b) => b.model.length - a.model.length)[0] ?? null
  );
}

export function estimateCost(
  rows: PricingRow[],
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): { cost: number; currency: string; priced: boolean } {
  const row = findPricing(rows, provider, model);
  if (!row) return { cost: 0, currency: 'USD', priced: false };
  const cost =
    (Math.max(0, inputTokens) / 1_000_000) * Number(row.input_per_million || 0) +
    (Math.max(0, outputTokens) / 1_000_000) * Number(row.output_per_million || 0);
  return { cost: Math.round(cost * 1_000_000) / 1_000_000, currency: row.currency || 'USD', priced: true };
}

export type ReserveReason =
  | 'rate_limited'
  | 'daily_quota_exceeded'
  | 'monthly_quota_exceeded'
  | 'duplicate_request';

export function remaining(limit: number | null, used: number) {
  return limit === null ? null : Math.max(0, limit - used);
}

/** True when usage has crossed the organization's warning threshold of a limit. */
export function isNearLimit(limit: number | null, used: number, threshold = 0.8) {
  return limit !== null && limit > 0 && used / limit >= threshold;
}
