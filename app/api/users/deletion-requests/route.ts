import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/system-access';
import { DELETION_SELECT, deletionDbError } from '@/lib/account-deletion-server';
import type { DeletionRequestRow } from '@/lib/account-deletion';

export const dynamic = 'force-dynamic';

const SYSTEM_ROLES = new Set(['super_admin', 'ceo']);

/** Review queue. Super admin / CEO see every request; other managers see their own business. */
export async function GET() {
  try {
    const access = await requireStaff({ manage: true });
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

    const isSystem = SYSTEM_ROLES.has(access.role ?? '');
    if (!isSystem && !access.tenantId) {
      return NextResponse.json({ items: [], can_process: true, is_system_admin: false });
    }

    let query = access.admin
      .from('account_deletion_requests')
      .select(DELETION_SELECT)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (!isSystem) query = query.eq('tenant_id', access.tenantId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: deletionDbError(error) }, { status: 500 });
    const rows = (data ?? []) as DeletionRequestRow[];

    const userIds = [
      ...new Set(rows.flatMap((r) => [r.user_id, r.reviewed_by]).filter(Boolean) as string[]),
    ];
    const tenantIds = [...new Set(rows.map((r) => r.tenant_id).filter(Boolean) as string[])];

    const [{ data: users }, { data: tenants }] = await Promise.all([
      userIds.length
        ? access.admin
            .from('users')
            .select('id, full_name, email, role, is_active, deleted_at')
            .in('id', userIds)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      tenantIds.length
        ? access.admin.from('tenants').select('id, name').in('id', tenantIds)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ]);

    const userById = new Map((users ?? []).map((u) => [String(u.id), u]));
    const tenantById = new Map((tenants ?? []).map((t) => [String(t.id), String(t.name ?? '')]));

    const items = rows.map((row) => {
      const account = row.user_id ? userById.get(row.user_id) : undefined;
      const reviewer = row.reviewed_by ? userById.get(row.reviewed_by) : undefined;
      return {
        ...row,
        account: account
          ? {
              full_name: (account.full_name as string | null) ?? null,
              role: (account.role as string | null) ?? null,
              is_active: (account.is_active as boolean | null) ?? null,
              deleted_at: (account.deleted_at as string | null) ?? null,
            }
          : null,
        reviewer_name: reviewer ? String(reviewer.full_name || reviewer.email || '') : null,
        tenant_name: row.tenant_id ? tenantById.get(row.tenant_id) ?? null : null,
      };
    });

    return NextResponse.json({ items, can_process: true, is_system_admin: isSystem });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load deletion requests';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
