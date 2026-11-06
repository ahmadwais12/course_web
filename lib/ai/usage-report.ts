import type { SupabaseClient } from '@supabase/supabase-js';
import { AIError, isMissingTableError } from '@/lib/ai/errors';

type UsageRow = {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  provider: string;
  model: string | null;
  request_type: string;
  module: string | null;
  counts_toward_quota: boolean;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost: number | string;
  currency: string;
  duration_ms: number | null;
  status: string;
  error_category: string | null;
  created_at: string;
};

const ROW_CAP = 20000;

function round(n: number, digits = 4) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function parseRange(url: URL) {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const today = new Date();
  const defaultFrom = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const from = iso.test(url.searchParams.get('from') ?? '') ? (url.searchParams.get('from') as string) : defaultFrom;
  const to = iso.test(url.searchParams.get('to') ?? '') ? (url.searchParams.get('to') as string) : today.toISOString().slice(0, 10);
  if (from > to) throw new AIError('invalid_input', 'from must be on or before to');
  return { from, to };
}

/** Aggregated AI usage for a date range, optionally limited to one organization. */
export async function buildUsageReport(
  admin: SupabaseClient,
  opts: { from: string; to: string; organizationId?: string | null; includeUsers?: boolean }
) {
  let query = admin
    .from('ai_usage_logs')
    .select(
      'id, organization_id, user_id, provider, model, request_type, module, counts_toward_quota, input_tokens, output_tokens, total_tokens, estimated_cost, currency, duration_ms, status, error_category, created_at'
    )
    .gte('created_at', `${opts.from}T00:00:00.000Z`)
    .lte('created_at', `${opts.to}T23:59:59.999Z`);
  if (opts.organizationId) query = query.eq('organization_id', opts.organizationId);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(ROW_CAP);
  if (error) {
    if (isMissingTableError(error)) throw new AIError('ai_tables_missing', error.message);
    throw new AIError('internal', error.message);
  }
  const rows = (data ?? []) as UsageRow[];

  const totals = {
    requests: 0,
    chat_requests: 0,
    successful: 0,
    failed: 0,
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    estimated_cost: 0,
    currency: rows.find((r) => r.currency)?.currency ?? 'USD',
    avg_duration_ms: 0,
  };
  const byDay: Record<string, { date: string; requests: number; tokens: number; cost: number }> = {};
  const byOrg: Record<string, { id: string | null; requests: number; tokens: number; cost: number }> = {};
  const byModule: Record<string, number> = {};
  const byModel: Record<string, { requests: number; cost: number }> = {};
  const byUser: Record<string, number> = {};
  const errors: Record<string, number> = {};
  let durationSum = 0;
  let durationCount = 0;

  for (const r of rows) {
    const cost = Number(r.estimated_cost) || 0;
    totals.requests++;
    if (r.request_type === 'chat') totals.chat_requests++;
    if (r.status === 'success') totals.successful++;
    if (r.status === 'failed') totals.failed++;
    totals.input_tokens += r.input_tokens || 0;
    totals.output_tokens += r.output_tokens || 0;
    totals.total_tokens += r.total_tokens || 0;
    totals.estimated_cost += cost;
    if (r.duration_ms && r.request_type === 'chat') {
      durationSum += r.duration_ms;
      durationCount++;
    }
    const day = r.created_at.slice(0, 10);
    byDay[day] ??= { date: day, requests: 0, tokens: 0, cost: 0 };
    byDay[day].requests++;
    byDay[day].tokens += r.total_tokens || 0;
    byDay[day].cost += cost;
    const orgKey = r.organization_id ?? 'platform';
    byOrg[orgKey] ??= { id: r.organization_id, requests: 0, tokens: 0, cost: 0 };
    byOrg[orgKey].requests++;
    byOrg[orgKey].tokens += r.total_tokens || 0;
    byOrg[orgKey].cost += cost;
    if (r.request_type === 'chat') byModule[r.module || 'general'] = (byModule[r.module || 'general'] ?? 0) + 1;
    const modelKey = r.model || 'unknown';
    byModel[modelKey] ??= { requests: 0, cost: 0 };
    byModel[modelKey].requests++;
    byModel[modelKey].cost += cost;
    if (r.user_id && r.request_type === 'chat') byUser[r.user_id] = (byUser[r.user_id] ?? 0) + 1;
    if (r.status === 'failed') errors[r.error_category || 'unknown'] = (errors[r.error_category || 'unknown'] ?? 0) + 1;
  }
  totals.estimated_cost = round(totals.estimated_cost);
  totals.avg_duration_ms = durationCount ? Math.round(durationSum / durationCount) : 0;

  const orgIds = Object.values(byOrg).map((o) => o.id).filter(Boolean) as string[];
  const topUserIds = Object.entries(byUser)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);
  const [orgRes, userRes, feedbackRes] = await Promise.all([
    orgIds.length ? admin.from('tenants').select('id, name').in('id', orgIds.slice(0, 500)) : Promise.resolve({ data: [] }),
    opts.includeUsers !== false && topUserIds.length
      ? admin.from('users').select('id, full_name, email').in('id', topUserIds)
      : Promise.resolve({ data: [] }),
    (() => {
      let fq = admin
        .from('ai_messages')
        .select(opts.organizationId ? 'feedback, ai_conversations!inner(organization_id)' : 'feedback')
        .not('feedback', 'is', null)
        .gte('created_at', `${opts.from}T00:00:00.000Z`)
        .lte('created_at', `${opts.to}T23:59:59.999Z`);
      if (opts.organizationId) fq = fq.eq('ai_conversations.organization_id', opts.organizationId);
      return fq.limit(ROW_CAP);
    })(),
  ]);
  const orgNames: Record<string, string> = {};
  for (const t of (orgRes.data ?? []) as { id: string; name: string }[]) orgNames[t.id] = t.name;
  const userNames: Record<string, string> = {};
  for (const u of (userRes.data ?? []) as { id: string; full_name: string | null; email: string | null }[]) {
    userNames[u.id] = u.full_name || u.email || 'User';
  }
  const feedbackRows = (feedbackRes.data ?? null) as { feedback: number }[] | null;

  return {
    range: { from: opts.from, to: opts.to },
    truncated: rows.length >= ROW_CAP,
    totals,
    by_day: Object.values(byDay)
      .map((d) => ({ ...d, cost: round(d.cost) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    by_organization: Object.values(byOrg)
      .map((o) => ({ ...o, name: o.id ? orgNames[o.id] || 'Unknown organization' : 'Platform', cost: round(o.cost) }))
      .sort((a, b) => b.requests - a.requests),
    by_module: Object.entries(byModule)
      .map(([module, requests]) => ({ module, requests }))
      .sort((a, b) => b.requests - a.requests),
    by_model: Object.entries(byModel).map(([model, v]) => ({ model, requests: v.requests, cost: round(v.cost) })),
    top_users: topUserIds.map((id) => ({ user_id: id, name: userNames[id] || 'User', requests: byUser[id] })),
    errors: Object.entries(errors)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    feedback: feedbackRows
      ? {
          positive: feedbackRows.filter((f) => f.feedback === 1).length,
          negative: feedbackRows.filter((f) => f.feedback === -1).length,
        }
      : null,
    recent: rows.slice(0, 50).map((r) => ({
      id: r.id,
      created_at: r.created_at,
      organization: r.organization_id ? orgNames[r.organization_id] || 'Unknown organization' : 'Platform',
      user: r.user_id ? userNames[r.user_id] ?? null : null,
      request_type: r.request_type,
      module: r.module,
      model: r.model,
      status: r.status,
      error_category: r.error_category,
      total_tokens: r.total_tokens,
      estimated_cost: round(Number(r.estimated_cost) || 0, 6),
      duration_ms: r.duration_ms,
    })),
  };
}
