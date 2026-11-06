import test from 'node:test';
import assert from 'node:assert/strict';
import { owned } from '@/lib/ai/conversations';
import { ToolScopeError, scoped, validateArgs } from '@/lib/ai/tools/common';
import { BUSINESS_TOOLS, executeTool } from '@/lib/ai/tools/index';
import { FIXTURES } from './fixtures';
import { makeCtx, mockDb, type RecordedQuery } from './helpers';

const OTHER_TENANT = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function opsOf(q: RecordedQuery, name: string) {
  return q.ops.filter((op) => op[0] === name);
}

test('scoped() adds the server-resolved tenant filter', () => {
  const ctx = makeCtx();
  const { db, queries } = mockDb();
  scoped((db as { from: (t: string) => unknown }).from('students'), ctx);
  assert.deepEqual(queries[0].ops, [['in', 'tenant_id', ctx.tenantScope]]);
});

test('scoped() refuses a missing or empty scope for non-platform users', () => {
  const { db } = mockDb();
  const query = (db as { from: (t: string) => unknown }).from('students');
  assert.throws(() => scoped(query, makeCtx({ tenantScope: null, isPlatformScope: false })), ToolScopeError);
  assert.throws(() => scoped(query, makeCtx({ tenantScope: [] })), ToolScopeError);
});

test('scoped() leaves platform-scope queries unfiltered', () => {
  const { db, queries } = mockDb();
  scoped((db as { from: (t: string) => unknown }).from('students'), makeCtx({ tenantScope: null, isPlatformScope: true, role: 'super_admin' }));
  assert.deepEqual(queries[0].ops, []);
});

test('validateArgs drops tenant/user ids and unknown keys invented by the model', () => {
  const schema = { type: 'object' as const, properties: { period: { type: 'string' as const }, limit: { type: 'integer' as const, minimum: 1, maximum: 50 } } };
  const out = validateArgs(schema, {
    period: 'this_month',
    limit: 500,
    tenant_id: OTHER_TENANT,
    organization_id: OTHER_TENANT,
    user_id: OTHER_TENANT,
    sql: 'select * from payments',
  });
  assert.deepEqual(out, { period: 'this_month', limit: 50 });
});

test('executeTool denies a tool outside the user’s modules without touching the database', async () => {
  const { db, queries } = mockDb();
  const result = await executeTool('get_revenue_summary', {}, makeCtx({ role: 'teacher', allowedModules: ['platform_support', 'academic'] }), db);
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.error, 'permission_denied');
  assert.equal(queries.length, 0);
});

test('executeTool rejects unknown tools', async () => {
  const { db } = mockDb();
  const result = await executeTool('drop_all_tables', {}, makeCtx(), db);
  assert.equal(!result.ok && result.error, 'unknown_tool');
});

test('inventory tools refuse tenant users even if the module were granted', async () => {
  const { db } = mockDb();
  const ctx = makeCtx({ allowedModules: ['inventory'] });
  for (const tool of BUSINESS_TOOLS.filter((t) => t.module === 'inventory')) {
    const result = await executeTool(tool.name, {}, ctx, db);
    assert.equal(!result.ok && result.error, 'permission_denied', tool.name);
  }
});

// Tables whose rows are only reached through ids already filtered by a tenant-scoped parent query.
const CHILD_TABLES = new Set(['tenants']);

test('the tenant-filter check itself catches an unscoped query', () => {
  const ctx = makeCtx();
  const { db, queries } = mockDb();
  (db as { from: (t: string) => { select: (c: string) => unknown } }).from('payments').select('amount');
  const scopedOk = queries.every((q) => opsOf(q, 'in').some((op) => JSON.stringify(op[2]) === JSON.stringify(ctx.tenantScope)));
  assert.equal(scopedOk, false);
});

// Tools that intentionally run no query for tenant users.
const NO_QUERY_TOOLS = new Set(['get_pending_admissions']);

for (const role of ['admin', 'teacher']) {
  test(`every business tool filters every query to the caller’s tenant scope (${role})`, async () => {
    const ctx = makeCtx({ role, allowedModules: ['platform_support', 'academic', 'admissions', 'finance', 'payroll', 'hr', 'reports'] });
    const tools = BUSINESS_TOOLS.filter((t) => t.module !== 'inventory');
    assert.ok(tools.length >= 15);
    for (const tool of tools) {
      for (const fixtures of [{}, FIXTURES]) {
        const { db, queries } = mockDb(fixtures);
        // A hostile model tries to point the tool at another organization.
        const result = await executeTool(tool.name, { tenant_id: OTHER_TENANT, organization_id: OTHER_TENANT }, ctx, db);
        assert.ok(result.ok, `${tool.name} failed: ${!result.ok ? result.message : ''}`);
        if (!NO_QUERY_TOOLS.has(tool.name)) assert.ok(queries.length > 0, `${tool.name} ran no queries`);
        for (const q of queries) {
          if (CHILD_TABLES.has(q.table)) continue;
          const tenantFilters = opsOf(q, 'in').filter((op) => JSON.stringify(op[2]) === JSON.stringify(ctx.tenantScope));
          assert.ok(tenantFilters.length > 0, `${tool.name}: query on ${q.table} is missing the tenant filter`);
          assert.ok(!JSON.stringify(q.ops).includes(OTHER_TENANT), `${tool.name}: query on ${q.table} used a model-supplied tenant`);
        }
      }
    }
  });
}

test('teachers only see students in their own classes', async () => {
  const ctx = makeCtx({ role: 'teacher', allowedModules: ['platform_support', 'academic'] });
  const { db, queries } = mockDb(FIXTURES);
  const result = await executeTool('get_student_count', {}, ctx, db);
  assert.ok(result.ok);
  const classes = queries.find((q) => q.table === 'classes');
  assert.ok(classes && opsOf(classes, 'eq').some((op) => op[1] === 'teacher_id' && op[2] === ctx.userId));
  const students = queries.find((q) => q.table === 'students');
  assert.ok(students && opsOf(students, 'in').some((op) => op[1] === 'class_id'));
});

test('conversation access is limited to the owner, tenant, and non-deleted rows', () => {
  const { db, queries } = mockDb();
  const ctx = makeCtx();
  owned((db as { from: (t: string) => unknown }).from('ai_conversations'), ctx);
  assert.deepEqual(queries[0].ops, [
    ['eq', 'user_id', ctx.userId],
    ['is', 'deleted_at', null],
    ['eq', 'tenant_id', ctx.tenantId],
  ]);
});

test('platform users without a tenant only see their own tenant-less conversations', () => {
  const { db, queries } = mockDb();
  const ctx = makeCtx({ tenantId: null, organizationId: null, tenantScope: null, isPlatformScope: true, role: 'super_admin' });
  owned((db as { from: (t: string) => unknown }).from('ai_conversations'), ctx);
  assert.deepEqual(queries[0].ops.at(-1), ['is', 'tenant_id', null]);
});
