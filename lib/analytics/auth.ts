import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/** Service-role client for analytics writes/reads (bypasses RLS). */
export function createAnalyticsAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase service role for analytics');
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Require signed-in user with Team or Reports ability (or bootstrap empty abilities). */
export async function requireAnalyticsAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: roleLinks } = await supabase
    .from('model_has_roles')
    .select('role_id')
    .eq('model_id', user.id)
    .eq('model_type', 'user');

  const roleIds = (roleLinks ?? []).map((r: { role_id: string }) => r.role_id);
  if (roleIds.length === 0) {
    // Bootstrap: allow signed-in admins when RBAC pivot empty
    return { user, supabase };
  }

  const { data: pivots } = await supabase
    .from('role_has_permissions')
    .select('permission_id')
    .in('role_id', roleIds);

  const permIds = [...new Set((pivots ?? []).map((p: { permission_id: string }) => p.permission_id))];
  if (permIds.length === 0) return { user, supabase };

  const { data: permissions } = await supabase
    .from('permissions')
    .select('name')
    .in('id', permIds);

  const names = new Set((permissions ?? []).map((p: { name: string }) => p.name));
  const allowed =
    names.has('Team') ||
    names.has('Reports') ||
    names.has('Dashboard') ||
    names.has('User Management');

  if (!allowed) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user, supabase };
}
