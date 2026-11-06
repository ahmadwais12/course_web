import test from 'node:test';
import assert from 'node:assert/strict';
import { AIError } from '@/lib/ai/errors';
import { estimateCost, findPricing, isNearLimit, remaining, resolveEffectiveLimits } from '@/lib/ai/quota';
import { reserveQuota } from '@/lib/ai/usage';
import { makeCtx, mockDb } from './helpers';

const PLANS = [
  { plan_slug: 'free_trial', monthly_limit: 50, daily_limit: 10, per_minute_limit: 3 },
  { plan_slug: 'basic', monthly_limit: 500, daily_limit: 30, per_minute_limit: 5 },
  { plan_slug: 'professional', monthly_limit: 2000, daily_limit: 100, per_minute_limit: 10 },
  { plan_slug: 'enterprise', monthly_limit: null, daily_limit: null, per_minute_limit: 20 },
  { plan_slug: 'default', monthly_limit: 100, daily_limit: 20, per_minute_limit: 5 },
];

test('plan limits match the configured plans', () => {
  assert.deepEqual(resolveEffectiveLimits('free_trial', PLANS), { daily: 10, monthly: 50, perMinute: 3, planSlug: 'free_trial' });
  assert.deepEqual(resolveEffectiveLimits('Basic', PLANS), { daily: 30, monthly: 500, perMinute: 5, planSlug: 'basic' });
  assert.equal(resolveEffectiveLimits('enterprise', PLANS).monthly, null);
});

test('unknown plans fall back to the default plan', () => {
  const limits = resolveEffectiveLimits('mystery', PLANS);
  assert.equal(limits.daily, 20);
  assert.equal(limits.monthly, 100);
});

test('organization overrides win over the plan, including 0 to block', () => {
  const limits = resolveEffectiveLimits('basic', PLANS, { daily_limit: 0, monthly_limit: 900, per_minute_limit: null });
  assert.equal(limits.daily, 0);
  assert.equal(limits.monthly, 900);
  assert.equal(limits.perMinute, 5);
});

test('cost uses configured per-million pricing with prefix matching', () => {
  const rows = [
    { provider: 'gemini', model: 'gemini-2.5-flash', input_per_million: 0.3, output_per_million: 2.5, currency: 'USD' },
    { provider: 'gemini', model: 'gemini-2.5-flash-lite', input_per_million: 0.1, output_per_million: 0.4, currency: 'USD' },
  ];
  assert.equal(findPricing(rows, 'gemini', 'gemini-2.5-flash-lite-001')?.model, 'gemini-2.5-flash-lite');
  const { cost, priced } = estimateCost(rows, 'gemini', 'gemini-2.5-flash', 1_000_000, 100_000);
  assert.equal(priced, true);
  assert.equal(cost, 0.55);
  assert.deepEqual(estimateCost(rows, 'gemini', 'unknown-model', 10, 10), { cost: 0, currency: 'USD', priced: false });
});

test('near-limit warning and remaining quota', () => {
  assert.equal(isNearLimit(10, 8), true);
  assert.equal(isNearLimit(10, 7), false);
  assert.equal(isNearLimit(null, 1000), false);
  assert.equal(remaining(10, 12), 0);
  assert.equal(remaining(null, 5), null);
});

test('reserveQuota sends server-resolved identity and limits to the atomic RPC', async () => {
  const ctx = makeCtx();
  const { db, rpcCalls } = mockDb({}, { data: { ok: true, id: 'u-1', daily_used: 3, monthly_used: 40 } });
  const limits = resolveEffectiveLimits('basic', PLANS);
  const res = await reserveQuota(db, ctx, {
    requestId: 'req-12345678',
    conversationId: null,
    module: 'finance',
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    limits,
  });
  assert.deepEqual(res, { ok: true, usageId: 'u-1', dailyUsed: 3, monthlyUsed: 40 });
  assert.equal(rpcCalls[0].fn, 'ai_reserve_quota');
  assert.equal(rpcCalls[0].params.p_organization_id, ctx.organizationId);
  assert.equal(rpcCalls[0].params.p_user_id, ctx.userId);
  assert.equal(rpcCalls[0].params.p_daily_limit, 30);
  assert.equal(rpcCalls[0].params.p_monthly_limit, 500);
});

test('reserveQuota reports limit and duplicate outcomes', async () => {
  const ctx = makeCtx();
  const limits = resolveEffectiveLimits('basic', PLANS);
  const input = { requestId: 'req-12345678', conversationId: null, module: null, provider: 'gemini', model: 'm', limits };

  const exceeded = await reserveQuota(mockDb({}, { data: { ok: false, reason: 'daily_quota_exceeded', daily_used: 30 } }).db, ctx, input);
  assert.equal(exceeded.ok, false);
  assert.equal(!exceeded.ok && exceeded.reason, 'daily_quota_exceeded');

  const dup = await reserveQuota(
    mockDb({}, { data: { ok: false, reason: 'duplicate_request', status: 'success', message_id: 'm-1' } }).db,
    ctx,
    input
  );
  assert.equal(!dup.ok && dup.existingStatus, 'success');
  assert.equal(!dup.ok && dup.existingMessageId, 'm-1');
});

test('reserveQuota surfaces a missing migration clearly', async () => {
  const { db } = mockDb({}, { error: { code: '42883', message: 'function ai_reserve_quota does not exist' } });
  await assert.rejects(
    reserveQuota(db, makeCtx(), {
      requestId: 'req-12345678',
      conversationId: null,
      module: null,
      provider: 'gemini',
      model: 'm',
      limits: resolveEffectiveLimits('basic', PLANS),
    }),
    (error: unknown) => error instanceof AIError && error.code === 'ai_tables_missing'
  );
});
