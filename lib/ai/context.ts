import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { loadUserAbilities } from '@/lib/abilities-server';
import { AIError } from '@/lib/ai/errors';
import { isPlatformRole } from '@/lib/ai/modules';
import { buildTenantScope, type TenantRow } from '@/lib/ai/scope';
import type { AIRequestContext } from '@/lib/ai/types';

const TENANT_COLUMNS = 'id, name, organization_type, parent_tenant_id, is_active, plan, settings';

/**
 * AIContextBuilder — authenticates the session and resolves user, organization, branch scope,
 * role and abilities entirely on the server. Nothing here is read from the request body.
 * `allowedModules` is filled in by the caller once organization AI settings are known.
 */
export async function resolveAIContext(): Promise<{ ctx: AIRequestContext; admin: SupabaseClient }> {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) throw new AIError('unauthorized');

  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from('users')
    .select('id, email, full_name, role, tenant_id, is_active, deleted_at')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw new AIError('internal', error.message);
  if (!profile) throw new AIError('forbidden', 'No users row for the signed-in account');
  if (profile.is_active === false || profile.deleted_at) throw new AIError('account_inactive');

  const role = String(profile.role || '');
  const { abilities } = await loadUserAbilities(admin, user.id);

  const base = {
    userId: user.id,
    email: (profile.email as string | null) ?? user.email ?? null,
    fullName: (profile.full_name as string | null) ?? null,
    role,
    abilities,
    allowedModules: [],
  };

  const tenantId = (profile.tenant_id as string | null) ?? null;
  if (!tenantId) {
    if (!isPlatformRole(role)) throw new AIError('no_organization');
    return {
      admin,
      ctx: {
        ...base,
        tenantId: null,
        organizationId: null,
        organizationName: 'Platform (all organizations)',
        planSlug: null,
        tenantScope: null,
        tenantNames: {},
        isPlatformScope: true,
        scopeLabel: 'Platform-wide (all organizations)',
        subscriptionActive: true,
        currency: 'AFN',
      },
    };
  }

  const { data: tenant } = await admin.from('tenants').select(TENANT_COLUMNS).eq('id', tenantId).maybeSingle();
  if (!tenant) throw new AIError('no_organization', 'Tenant row not found');
  const t = tenant as TenantRow;

  const [parentRes, childrenRes] = await Promise.all([
    t.parent_tenant_id
      ? admin.from('tenants').select(TENANT_COLUMNS).eq('id', t.parent_tenant_id).maybeSingle()
      : Promise.resolve({ data: null }),
    t.organization_type === 'branch' && t.parent_tenant_id
      ? Promise.resolve({ data: [] })
      : admin.from('tenants').select(TENANT_COLUMNS).eq('parent_tenant_id', t.id),
  ]);

  const scope = buildTenantScope(
    t,
    (parentRes.data as TenantRow | null) ?? null,
    ((childrenRes.data ?? []) as TenantRow[])
  );

  return {
    admin,
    ctx: {
      ...base,
      tenantId,
      organizationId: scope.organization.id,
      organizationName: scope.organization.name,
      planSlug: scope.organization.plan,
      tenantScope: scope.tenantScope,
      tenantNames: scope.tenantNames,
      isPlatformScope: false,
      scopeLabel: scope.scopeLabel,
      subscriptionActive: scope.subscriptionActive,
      currency: scope.currency,
    },
  };
}
