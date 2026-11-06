import { NextResponse } from 'next/server';
import { requireSystemAdmin, requestMeta } from '@/lib/system-access';

export const dynamic = 'force-dynamic';

type LogRow = {
  id: string;
  created_at: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  user_id: string | null;
  tenant_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
};

/** GET activity logs for all accounts (super_admin / ceo). */
export async function GET(request: Request) {
  try {
    const access = await requireSystemAdmin();
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(request.url);
    const action = (searchParams.get('action') || '').trim();
    const entityType = (searchParams.get('entity_type') || '').trim();
    const from = (searchParams.get('from') || '').trim();
    const to = (searchParams.get('to') || '').trim();
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 500), 1), 1000);

    let query = access.admin
      .from('system_logs')
      .select(
        'id, created_at, action, entity_type, entity_id, details, user_id, tenant_id, ip_address, user_agent'
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (action) query = query.eq('action', action);
    if (entityType) query = query.eq('entity_type', entityType);
    if (from) query = query.gte('created_at', `${from}T00:00:00.000Z`);
    if (to) query = query.lte('created_at', `${to}T23:59:59.999Z`);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json(
        {
          error:
            error.message.includes('system_logs') || error.code === '42P01'
              ? 'Logs table missing. Apply migration 20261103_soft_delete_logs_trash.sql'
              : error.message,
        },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as LogRow[];
    const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean) as string[])];
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
      rows.map((r) => ({
        ...r,
        user_name: r.user_id ? nameById.get(r.user_id) ?? null : null,
        details_summary:
          r.details && typeof r.details === 'object'
            ? String(
                (r.details as { display_name?: string }).display_name ||
                  (r.details as { name?: string }).name ||
                  JSON.stringify(r.details).slice(0, 120)
              )
            : '',
      }))
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load logs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Optional: allow clients to append a manual log entry (system admins). */
export async function POST(request: Request) {
  try {
    const access = await requireSystemAdmin();
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const body = await request.json();
    const action = String(body.action ?? '').trim();
    if (!action) return NextResponse.json({ error: 'action is required' }, { status: 400 });

    const meta = requestMeta(request);
    const { data, error } = await access.admin
      .from('system_logs')
      .insert({
        tenant_id: access.tenantId,
        user_id: access.user.id,
        action,
        entity_type: body.entity_type ? String(body.entity_type) : null,
        entity_id: body.entity_id ? String(body.entity_id) : null,
        details: body.details && typeof body.details === 'object' ? body.details : { note: body.details },
        ip_address: meta.ipAddress,
        user_agent: meta.userAgent,
      })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to write log';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
