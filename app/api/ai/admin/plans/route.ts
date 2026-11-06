import { NextResponse } from 'next/server';
import { auditAIChange, requirePlatformAdmin } from '@/lib/ai/admin-access';
import { AIError } from '@/lib/ai/errors';
import { aiErrorResponse, readJson } from '@/lib/ai/http';
import { loadPlanLimits } from '@/lib/ai/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { admin } = await requirePlatformAdmin();
    return NextResponse.json({ data: await loadPlanLimits(admin) });
  } catch (error) {
    return aiErrorResponse(error, 'ai/admin/plans');
  }
}

function limit(value: unknown, field: string) {
  if (value === null || value === '' || value === undefined) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 10_000_000) throw new AIError('invalid_input', `${field} must be a whole number ≥ 0`);
  return n;
}

/** Upsert one plan's AI limits. Body: { plan_slug, label?, monthly_limit, daily_limit, per_minute_limit } (null = unlimited). */
export async function PUT(request: Request) {
  try {
    const body = await readJson(request);
    const { ctx, admin } = await requirePlatformAdmin();
    const slug = String(body.plan_slug ?? '').trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,40}$/.test(slug)) throw new AIError('invalid_input', 'plan_slug must be 2–40 lowercase letters, digits, - or _');
    const row = {
      plan_slug: slug,
      label: body.label ? String(body.label).slice(0, 80) : slug,
      monthly_limit: limit(body.monthly_limit, 'monthly_limit'),
      daily_limit: limit(body.daily_limit, 'daily_limit'),
      per_minute_limit: limit(body.per_minute_limit, 'per_minute_limit'),
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    };
    const { error } = await admin.from('ai_plan_limits').upsert(row, { onConflict: 'plan_slug' });
    if (error) throw new AIError('internal', error.message);
    await auditAIChange(admin, ctx, request, {
      action: 'ai.plan_limits.updated',
      entityType: 'ai_plan_limits',
      entityId: slug,
      details: row,
    });
    return NextResponse.json({ data: await loadPlanLimits(admin) });
  } catch (error) {
    return aiErrorResponse(error, 'ai/admin/plans');
  }
}
