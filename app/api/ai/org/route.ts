import { NextResponse } from 'next/server';
import { auditAIChange, requireOrgAdmin } from '@/lib/ai/admin-access';
import { AIError } from '@/lib/ai/errors';
import { aiErrorResponse, readJson } from '@/lib/ai/http';
import { STAFF_ROLES } from '@/lib/ai/modules';
import { resolveEffectiveLimits } from '@/lib/ai/quota';
import { loadGlobalSettings, loadPlanLimits, loadTenantSettings } from '@/lib/ai/settings';
import { getUsageCounts } from '@/lib/ai/usage';
import { buildUsageReport, parseRange } from '@/lib/ai/usage-report';

export const dynamic = 'force-dynamic';

/** Organization admin view: own organization's AI settings, limits, and usage only. */
export async function GET(request: Request) {
  try {
    const { ctx, admin } = await requireOrgAdmin();
    const orgId = ctx.organizationId as string;
    const url = new URL(request.url);
    const { from, to } = parseRange(url);
    const [global, settings, plans, counts, report] = await Promise.all([
      loadGlobalSettings(admin),
      loadTenantSettings(admin, orgId),
      loadPlanLimits(admin),
      getUsageCounts(admin, orgId),
      buildUsageReport(admin, { from, to, organizationId: orgId }),
    ]);
    const limits = resolveEffectiveLimits(ctx.planSlug, plans, settings);
    return NextResponse.json({
      organization: { id: orgId, name: ctx.organizationName, plan: ctx.planSlug },
      platform_enabled: global.enabled,
      settings: settings && {
        enabled: settings.enabled,
        org_enabled: settings.org_enabled,
        org_admin_can_toggle: settings.org_admin_can_toggle,
        allowed_modules: settings.allowed_modules,
        allowed_roles: settings.allowed_roles,
        warning_threshold: settings.warning_threshold,
      },
      limits,
      usage: counts,
      report: {
        range: report.range,
        totals: {
          requests: report.totals.chat_requests,
          successful: report.totals.successful,
          failed: report.totals.failed,
          total_tokens: report.totals.total_tokens,
        },
        by_day: report.by_day.map((d) => ({ date: d.date, requests: d.requests })),
        by_module: report.by_module,
        top_users: report.top_users,
        feedback: report.feedback,
      },
      staff_roles: STAFF_ROLES,
    });
  } catch (error) {
    return aiErrorResponse(error, 'ai/org');
  }
}

/** Body: { org_enabled?, allowed_roles? } — limits and modules stay under Super Admin control. */
export async function PUT(request: Request) {
  try {
    const body = await readJson(request);
    const { ctx, admin } = await requireOrgAdmin();
    const orgId = ctx.organizationId as string;
    const before = await loadTenantSettings(admin, orgId);
    if (!before) throw new AIError('no_organization');

    const next: Record<string, unknown> = { tenant_id: orgId, updated_by: ctx.userId, updated_at: new Date().toISOString() };
    if (body.org_enabled !== undefined) {
      if (!before.org_admin_can_toggle) throw new AIError('forbidden', 'Toggling AI is disabled for this organization');
      next.org_enabled = Boolean(body.org_enabled);
    }
    if (body.allowed_roles !== undefined) {
      next.allowed_roles =
        Array.isArray(body.allowed_roles) && body.allowed_roles.length
          ? (body.allowed_roles as unknown[]).filter(
              (r): r is string => (STAFF_ROLES as readonly string[]).includes(String(r)) && r !== 'super_admin'
            )
          : null;
    }
    if (Object.keys(next).length <= 3) throw new AIError('invalid_input', 'Nothing to update');

    const { error } = await admin.from('ai_tenant_settings').upsert(next, { onConflict: 'tenant_id' });
    if (error) throw new AIError('internal', error.message);
    const after = await loadTenantSettings(admin, orgId);
    await auditAIChange(admin, ctx, request, {
      action: 'ai.organization_settings.updated_by_org_admin',
      entityType: 'ai_tenant_settings',
      entityId: orgId,
      details: {
        before: { org_enabled: before.org_enabled, allowed_roles: before.allowed_roles },
        after: { org_enabled: after?.org_enabled, allowed_roles: after?.allowed_roles },
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return aiErrorResponse(error, 'ai/org');
  }
}
