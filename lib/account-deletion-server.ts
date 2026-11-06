import type { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { notifyUsers } from '@/lib/communication-server';

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export const DELETION_SELECT =
  'id, nid, tenant_id, user_id, full_name, email, phone, reason, source, status, admin_note, reviewed_by, reviewed_at, ip_address, user_agent, created_at, updated_at';

export const MIGRATION_HINT =
  'Account deletion requests are not enabled yet. Apply migration 20261105_account_deletion_requests.sql';

export function deletionDbError(error: { message: string; code?: string }) {
  if (error.code === '42P01' || error.code === 'PGRST205' || /account_deletion_requests/.test(error.message)) {
    return MIGRATION_HINT;
  }
  return error.message;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function clean(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max);
}

/** System admins everywhere, plus admins / branch managers of the account's tenant. */
export async function notifyDeletionReviewers(
  admin: AdminClient,
  input: { requestId: string; tenantId: string | null; name: string; email: string }
) {
  try {
    const { data: system } = await admin
      .from('users')
      .select('id')
      .in('role', ['super_admin', 'ceo'])
      .is('deleted_at', null)
      .not('is_active', 'is', false);
    let ids = (system ?? []).map((u) => u.id as string);

    if (input.tenantId) {
      const { data: local } = await admin
        .from('users')
        .select('id')
        .in('role', ['admin', 'branch_manager'])
        .eq('tenant_id', input.tenantId)
        .is('deleted_at', null)
        .not('is_active', 'is', false);
      ids = ids.concat((local ?? []).map((u) => u.id as string));
    }
    if (!ids.length) return;

    await notifyUsers(admin, ids, {
      title: 'Account deletion requested',
      message: `${input.name || input.email} (${input.email}) asked for their account to be deleted.`,
      tenantId: input.tenantId,
      type: 'system',
      priority: 'high',
      actionUrl: '/users/deletion-requests',
      data: { deletion_request_id: input.requestId },
    });
  } catch {
    /* a failed notification must not lose the request */
  }
}
