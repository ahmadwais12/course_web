import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const SYSTEM_ADMIN_ROLES = new Set(['super_admin', 'ceo']);

export type SystemAccessOk = {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  user: { id: string; email?: string | null };
  role: string | null;
  tenantId: string | null;
};

export type SystemAccessError = { error: string; status: 401 | 403 };

/** Signed-in super_admin / ceo with service-role client (bypasses RLS after check). */
export async function requireSystemAdmin(): Promise<SystemAccessOk | SystemAccessError> {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return { error: 'Sign in required', status: 401 };

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from('users')
    .select('id, role, tenant_id, is_active, deleted_at')
    .eq('id', user.id)
    .maybeSingle();

  const role =
    (profile?.role as string | undefined) ||
    (typeof user.user_metadata?.role === 'string' ? user.user_metadata.role : null);

  if (!role || !SYSTEM_ADMIN_ROLES.has(role)) {
    return { error: 'System admin access required', status: 403 };
  }

  if (profile?.deleted_at) {
    return { error: 'Account is deleted', status: 403 };
  }

  return {
    admin,
    user: { id: user.id, email: user.email },
    role,
    tenantId: (profile?.tenant_id as string | null) ?? null,
  };
}

/** Any signed-in user + admin client (for writing activity logs from mutating routes). */
export async function requireSignedInAdmin() {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return { error: 'Sign in required', status: 401 as const };
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from('users')
    .select('id, role, tenant_id')
    .eq('id', user.id)
    .maybeSingle();
  return {
    admin,
    user: { id: user.id, email: user.email },
    role: (profile?.role as string | null) ?? null,
    tenantId: (profile?.tenant_id as string | null) ?? null,
  };
}

const NON_STAFF_ROLES = new Set(['student', 'guardian', 'parent']);
const MANAGER_ROLES = new Set(['super_admin', 'ceo', 'admin', 'branch_manager']);

export function isManagerRole(role: string | null | undefined) {
  return Boolean(role && MANAGER_ROLES.has(role));
}

/**
 * Signed-in staff (not student / guardian) with service-role client.
 * `manage: true` additionally requires super_admin / ceo / admin / branch_manager.
 */
export async function requireStaff(
  options: { manage?: boolean } = {}
): Promise<SystemAccessOk | SystemAccessError> {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return { error: 'Sign in required', status: 401 };

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from('users')
    .select('id, role, tenant_id')
    .eq('id', user.id)
    .maybeSingle();

  const role =
    (profile?.role as string | undefined) ||
    (typeof user.user_metadata?.role === 'string' ? user.user_metadata.role : null);

  if (!role || NON_STAFF_ROLES.has(role)) {
    return { error: 'Staff access required', status: 403 };
  }
  if (options.manage && !MANAGER_ROLES.has(role)) {
    return { error: 'Admin access required', status: 403 };
  }

  return {
    admin,
    user: { id: user.id, email: user.email },
    role,
    tenantId: (profile?.tenant_id as string | null) ?? null,
  };
}

export function requestMeta(request?: Request | null) {
  const forwarded = request?.headers.get('x-forwarded-for');
  const ip =
    forwarded?.split(',')[0]?.trim() ||
    request?.headers.get('x-real-ip') ||
    null;
  return {
    ipAddress: ip,
    userAgent: request?.headers.get('user-agent') || null,
  };
}
