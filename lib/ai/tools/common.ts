import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIModule } from '@/lib/ai/modules';
import { PERIOD_KEYS, ToolArgumentError, resolvePeriod, type ResolvedPeriod } from '@/lib/ai/period';
import type { ToolParameterSchema } from '@/lib/ai/providers/types';
import type { AIRequestContext, ToolResult } from '@/lib/ai/types';

export type ToolDb = SupabaseClient;

export type ToolDefinition = {
  name: string;
  module: AIModule;
  description: string;
  parameters: ToolParameterSchema;
  execute: (args: Record<string, unknown>, ctx: AIRequestContext, db: ToolDb) => Promise<ToolResult>;
};

export class ToolScopeError extends Error {}
export class ToolDataError extends Error {}

/** Max rows a single tool query may read before aggregating (results are flagged as truncated). */
export const ROW_CAP = 10000;
export const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export const PERIOD_PARAMS: ToolParameterSchema['properties'] = {
  period: {
    type: 'string',
    enum: [...PERIOD_KEYS],
    description: 'Preset date range. Defaults to this_month. Use custom with from/to for explicit dates.',
  },
  from: { type: 'string', description: 'Start date YYYY-MM-DD (only with period=custom).' },
  to: { type: 'string', description: 'End date YYYY-MM-DD (only with period=custom).' },
};

type InFilterable<Q> = { in: (column: string, values: string[]) => Q };

/**
 * Mandatory tenant filter for every business query. Tenant ids come only from the
 * server-resolved context; platform scope (no filter) is allowed only for platform users.
 */
export function scoped<Q>(query: Q, ctx: AIRequestContext, column = 'tenant_id'): Q {
  if (ctx.tenantScope === null) {
    if (!ctx.isPlatformScope) throw new ToolScopeError('Missing tenant scope');
    return query;
  }
  if (ctx.tenantScope.length === 0) throw new ToolScopeError('Empty tenant scope');
  return (query as unknown as InFilterable<Q>).in(column, ctx.tenantScope);
}

export async function fetchRows<T = Record<string, unknown>>(
  query: PromiseLike<{ data: unknown; error: { message: string } | null }>,
  cap = ROW_CAP
): Promise<{ rows: T[]; truncated: boolean }> {
  const { data, error } = await query;
  if (error) throw new ToolDataError(error.message);
  const rows = (Array.isArray(data) ? data : []) as T[];
  return { rows, truncated: rows.length >= cap };
}

/** Drop undeclared keys (e.g. a model-invented tenant_id), coerce types, enforce enums and ranges. */
export function validateArgs(schema: ToolParameterSchema, raw: unknown): Record<string, unknown> {
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(schema.properties)) {
    let value = input[key];
    if (value === undefined || value === null || value === '') continue;
    if (spec.type === 'integer' || spec.type === 'number') {
      const n = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(n)) throw new ToolArgumentError(`${key} must be a number`);
      value = spec.type === 'integer' ? Math.trunc(n) : n;
      if (spec.minimum !== undefined && (value as number) < spec.minimum) value = spec.minimum;
      if (spec.maximum !== undefined && (value as number) > spec.maximum) value = spec.maximum;
    } else if (spec.type === 'boolean') {
      value = value === true || value === 'true';
    } else {
      if (typeof value !== 'string') throw new ToolArgumentError(`${key} must be text`);
      value = value.trim().slice(0, 200);
      if (spec.enum && !spec.enum.includes(value as string)) {
        throw new ToolArgumentError(`${key} must be one of: ${spec.enum.join(', ')}`);
      }
    }
    out[key] = value;
  }
  for (const key of schema.required ?? []) {
    if (out[key] === undefined) throw new ToolArgumentError(`${key} is required`);
  }
  return out;
}

export function periodFrom(args: Record<string, unknown>, fallback?: Parameters<typeof resolvePeriod>[2]): ResolvedPeriod {
  return resolvePeriod(args, new Date(), fallback);
}

export function dayStart(date: string) {
  return `${date}T00:00:00.000Z`;
}

export function dayEnd(date: string) {
  return `${date}T23:59:59.999Z`;
}

export function money(n: number) {
  return Math.round(n * 100) / 100;
}

export function pct(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;
}

export function countBy<T>(rows: T[], key: (row: T) => string | null | undefined) {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const k = key(row) || 'unspecified';
    map[k] = (map[k] ?? 0) + 1;
  }
  return map;
}

export function sumBy<T>(rows: T[], key: (row: T) => string | null | undefined, value: (row: T) => number) {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const k = key(row) || 'unspecified';
    map[k] = money((map[k] ?? 0) + value(row));
  }
  return map;
}

export function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Resolve tenant names for grouping (context names first, then a single lookup for platform scope). */
export async function tenantNameMap(db: ToolDb, ctx: AIRequestContext, ids: string[]) {
  const names: Record<string, string> = { ...ctx.tenantNames };
  const missing = [...new Set(ids.filter((id) => id && !names[id]))].slice(0, 200);
  if (missing.length && ctx.isPlatformScope) {
    const { data } = await db.from('tenants').select('id, name').in('id', missing);
    for (const row of (data ?? []) as { id: string; name: string | null }[]) names[row.id] = row.name || 'Unnamed';
  }
  return names;
}

export function labelTenants(map: Record<string, number>, names: Record<string, string>) {
  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(map)) {
    const label = id === 'unspecified' ? 'No organization' : names[id] || 'Other';
    out[label] = (out[label] ?? 0) + value;
  }
  return out;
}

export function scopeInfo(ctx: AIRequestContext, period?: ResolvedPeriod, extra: Record<string, unknown> = {}) {
  return {
    organization: ctx.organizationName,
    branch_scope: ctx.scopeLabel,
    ...(period ? { period: period.label, from: period.from, to: period.to } : {}),
    ...extra,
  };
}

export function topEntries(map: Record<string, number>, limit: number, direction: 'desc' | 'asc' = 'desc') {
  return Object.entries(map)
    .sort((a, b) => (direction === 'desc' ? b[1] - a[1] : a[1] - b[1]))
    .slice(0, limit);
}

/** Teachers only see their own classes; other roles get null (no extra restriction). */
export async function teacherClassIds(db: ToolDb, ctx: AIRequestContext): Promise<string[] | null> {
  if (ctx.role !== 'teacher') return null;
  if (ctx.teacherClassIds) return ctx.teacherClassIds;
  const { rows } = await fetchRows<{ id: string }>(
    scoped(db.from('classes').select('id'), ctx).eq('teacher_id', ctx.userId).limit(200),
    200
  );
  ctx.teacherClassIds = rows.map((r) => r.id);
  return ctx.teacherClassIds;
}

export function idsOrNil(ids: string[]) {
  return ids.length ? ids : [NIL_UUID];
}
