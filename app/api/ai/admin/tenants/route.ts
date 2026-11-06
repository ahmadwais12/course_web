import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/ai/admin-access';
import { AIError, isMissingTableError } from '@/lib/ai/errors';
import { aiErrorResponse } from '@/lib/ai/http';
import { resolveEffectiveLimits } from '@/lib/ai/quota';
import { loadPlanLimits, normalizeTenantSettings } from '@/lib/ai/settings';

export const dynamic = 'force-dynamic';

/** Every billing organization (central / standalone tenant) with its AI settings and this month's usage. */
export async function GET() {
  try {
    const { admin } = await requirePlatformAdmin();
    const [tenantsRes, settingsRes, plans] = await Promise.all([
      admin.from('tenants').select('id, name, organization_type, parent_tenant_id, is_active, plan').is('parent_tenant_id', null).order('name'),
      admin.from('ai_tenant_settings').select('*'),
      loadPlanLimits(admin),
    ]);
    if (tenantsRes.error) throw new AIError('internal', tenantsRes.error.message);
    if (settingsRes.error) {
      if (isMissingTableError(settingsRes.error)) throw new AIError('ai_tables_missing', settingsRes.error.message);
      throw new AIError('internal', settingsRes.error.message);
    }

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const { data: usage } = await admin
      .from('ai_usage_logs')
      .select('organization_id')
      .eq('counts_toward_quota', true)
      .eq('status', 'success')
      .gte('created_at', monthStart)
      .limit(50000);
    const monthly: Record<string, number> = {};
    for (const row of (usage ?? []) as { organization_id: string | null }[]) {
      if (row.organization_id) monthly[row.organization_id] = (monthly[row.organization_id] ?? 0) + 1;
    }

    const settingsById = new Map(
      ((settingsRes.data ?? []) as Record<string, unknown>[]).map((row) => [String(row.tenant_id), row])
    );
    const data = ((tenantsRes.data ?? []) as {
      id: string;
      name: string;
      organization_type: string | null;
      is_active: boolean | null;
      plan: string | null;
    }[]).map((t) => {
      const settings = normalizeTenantSettings(t.id, (settingsById.get(t.id) as Record<string, unknown>) ?? null);
      const limits = resolveEffectiveLimits(t.plan, plans, settings);
      return {
        id: t.id,
        name: t.name,
        organization_type: t.organization_type,
        is_active: t.is_active !== false,
        plan: t.plan,
        settings,
        has_custom_settings: settingsById.has(t.id),
        effective_limits: limits,
        monthly_used: monthly[t.id] ?? 0,
      };
    });
    return NextResponse.json({ data, plans });
  } catch (error) {
    return aiErrorResponse(error, 'ai/admin/tenants');
  }
}
