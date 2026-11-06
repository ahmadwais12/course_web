import type { AIRequestContext } from '@/lib/ai/types';

export type RecordedQuery = { table: string; ops: [string, ...unknown[]][] };

/**
 * Chainable stand-in for the Supabase query builder. Every call is recorded so tests can
 * assert which filters a tool applied; awaiting a query resolves to the table fixture.
 */
export function mockDb(fixtures: Record<string, unknown[]> = {}, rpcResult: { data?: unknown; error?: unknown } = {}) {
  const queries: RecordedQuery[] = [];
  const rpcCalls: { fn: string; params: Record<string, unknown> }[] = [];

  const from = (table: string) => {
    const record: RecordedQuery = { table, ops: [] };
    queries.push(record);
    const builder: Record<string | symbol, unknown> = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'then') {
            const result = { data: fixtures[table] ?? [], error: null, count: (fixtures[table] ?? []).length };
            return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
              Promise.resolve(result).then(resolve, reject);
          }
          return (...args: unknown[]) => {
            record.ops.push([String(prop), ...args]);
            return builder;
          };
        },
      }
    );
    return builder;
  };

  const db = {
    from,
    rpc: async (fn: string, params: Record<string, unknown>) => {
      rpcCalls.push({ fn, params });
      return { data: rpcResult.data ?? null, error: rpcResult.error ?? null };
    },
  };
  return { db: db as never, queries, rpcCalls };
}

export function makeCtx(overrides: Partial<AIRequestContext> = {}): AIRequestContext {
  return {
    userId: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
    fullName: 'Test User',
    role: 'admin',
    abilities: [],
    tenantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    organizationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    organizationName: 'Org A',
    planSlug: 'basic',
    tenantScope: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],
    tenantNames: { 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa': 'Org A', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb': 'Org A Branch' },
    isPlatformScope: false,
    scopeLabel: 'Org A (all branches)',
    subscriptionActive: true,
    currency: 'AFN',
    allowedModules: ['platform_support', 'academic', 'admissions', 'finance', 'hr', 'reports'],
    ...overrides,
  };
}
