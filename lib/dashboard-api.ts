import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const NON_STAFF_ROLES = new Set(['student', 'guardian', 'parent']);

export type DashboardSession = {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  userId: string;
  role: string;
  tenantId: string | null;
};

export type DashboardAuthResult =
  | { ok: true; session: DashboardSession }
  | { ok: false; response: NextResponse };

/** Cookie session + service-role client for internal management APIs. */
export async function requireDashboardUser(): Promise<DashboardAuthResult> {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Sign in required' }, { status: 401 }) };
  }

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from('users')
    .select('id, role, tenant_id')
    .eq('id', user.id)
    .maybeSingle();

  const role = String(
    (profile as { role?: string } | null)?.role ||
      (typeof user.user_metadata?.role === 'string' ? user.user_metadata.role : '') ||
      ''
  );
  if (NON_STAFF_ROLES.has(role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Staff access required' }, { status: 403 }),
    };
  }

  return {
    ok: true,
    session: {
      admin,
      userId: user.id,
      role,
      tenantId: (profile as { tenant_id?: string | null } | null)?.tenant_id ?? null,
    },
  };
}

export function dashboardError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}
