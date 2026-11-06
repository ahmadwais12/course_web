import { NextResponse } from 'next/server';
import { auditAIChange, requirePlatformAdmin } from '@/lib/ai/admin-access';
import { AIError } from '@/lib/ai/errors';
import { aiErrorResponse, readJson } from '@/lib/ai/http';
import { AI_MODULES, STAFF_ROLES } from '@/lib/ai/modules';
import { isUuid } from '@/lib/ai/security';
import { loadTenantSettings } from '@/lib/ai/settings';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

function nullableLimit(value: unknown, field: string) {
  if (value === null || value === '' || value === undefined) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 10_000_000) throw new AIError('invalid_input', `${field} must be a whole number ≥ 0`);
  return n;
}

/** Super Admin: enable/disable AI, override limits, and restrict modules/roles for one organization. */
export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!isUuid(id)) throw new AIError('not_found');
    const body = await readJson(request);
    const { ctx, admin } = await requirePlatformAdmin();

    const { data: tenant } = await admin.from('tenants').select('id, name, parent_tenant_id').eq('id', id).maybeSingle();
    if (!tenant) throw new AIError('not_found');
    if (tenant.parent_tenant_id) throw new AIError('invalid_input', 'AI settings are managed on the central organization, not a branch.');

    const before = await loadTenantSettings(admin, id);
    const next: Record<string, unknown> = { tenant_id: id, updated_by: ctx.userId, updated_at: new Date().toISOString() };
    if (body.enabled !== undefined) next.enabled = Boolean(body.enabled);
    if (body.org_admin_can_toggle !== undefined) next.org_admin_can_toggle = Boolean(body.org_admin_can_toggle);
    if (body.org_enabled !== undefined) next.org_enabled = Boolean(body.org_enabled);
    for (const field of ['monthly_limit', 'daily_limit', 'per_minute_limit'] as const) {
      if (body[field] !== undefined) next[field] = nullableLimit(body[field], field);
    }
    if (body.allowed_modules !== undefined) {
      if (!Array.isArray(body.allowed_modules)) throw new AIError('invalid_input', 'allowed_modules must be a list');
      next.allowed_modules = (body.allowed_modules as unknown[]).filter((m): m is string =>
        (AI_MODULES as readonly string[]).includes(String(m))
      );
    }
    if (body.allowed_roles !== undefined) {
      next.allowed_roles =
        Array.isArray(body.allowed_roles) && body.allowed_roles.length
          ? (body.allowed_roles as unknown[]).filter((r): r is string => (STAFF_ROLES as readonly string[]).includes(String(r)))
          : null;
    }
    if (body.warning_threshold !== undefined) {
      const w = Number(body.warning_threshold);
      if (!Number.isFinite(w) || w < 0.1 || w > 1) throw new AIError('invalid_input', 'warning_threshold must be between 0.1 and 1');
      next.warning_threshold = w;
    }
    if (body.notes !== undefined) next.notes = body.notes ? String(body.notes).slice(0, 1000) : null;

    const { error } = await admin.from('ai_tenant_settings').upsert(next, { onConflict: 'tenant_id' });
    if (error) throw new AIError('internal', error.message);
    const after = await loadTenantSettings(admin, id);

    await auditAIChange(admin, ctx, request, {
      action: 'ai.organization_settings.updated',
      entityType: 'ai_tenant_settings',
      entityId: id,
      details: { organization: tenant.name, before, after },
    });
    return NextResponse.json({ settings: after });
  } catch (error) {
    return aiErrorResponse(error, 'ai/admin/tenant');
  }
}
