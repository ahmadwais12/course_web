import { NextResponse } from 'next/server';
import { requireSystemAdmin } from '@/lib/system-access';
import { ENTITY_LABELS, type SoftDeleteEntityType } from '@/lib/soft-delete';

export const dynamic = 'force-dynamic';

/** List soft-deleted records (Trash). */
export async function GET(request: Request) {
  try {
    const access = await requireSystemAdmin();
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(request.url);
    const entityType = (searchParams.get('entity_type') || '').trim();
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 500), 1), 1000);

    let query = access.admin
      .from('trash_index')
      .select(
        'id, entity_type, entity_id, table_name, display_name, tenant_id, deleted_by, deleted_at, snapshot'
      )
      .order('deleted_at', { ascending: false })
      .limit(limit);

    if (entityType) query = query.eq('entity_type', entityType);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json(
        {
          error:
            /trash_index|42P01/i.test(error.message) || error.code === '42P01'
              ? 'Trash is not enabled yet. Apply migration 20261103_soft_delete_logs_trash.sql'
              : error.message,
        },
        { status: 500 }
      );
    }

    const rows = data ?? [];
    const userIds = [...new Set(rows.map((r) => r.deleted_by).filter(Boolean) as string[])];
    const nameById = new Map<string, string>();
    if (userIds.length) {
      const { data: users } = await access.admin
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);
      for (const u of users ?? []) {
        nameById.set(u.id, u.full_name || u.email || u.id);
      }
    }

    return NextResponse.json(
      rows.map((r) => {
        const type = r.entity_type as SoftDeleteEntityType;
        return {
          id: r.id,
          entity_type: r.entity_type,
          entity_label: ENTITY_LABELS[type] || r.entity_type,
          entity_id: r.entity_id,
          table_name: r.table_name,
          display_name: r.display_name || 'Untitled',
          tenant_id: r.tenant_id,
          deleted_by: r.deleted_by,
          deleted_by_name: r.deleted_by ? nameById.get(r.deleted_by) ?? null : null,
          deleted_at: r.deleted_at,
          snapshot: r.snapshot ?? null,
        };
      })
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load trash';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
