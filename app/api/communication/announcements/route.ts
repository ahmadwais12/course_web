import { NextResponse } from 'next/server';
import { isManagerRole, requireStaff } from '@/lib/system-access';
import {
  ANNOUNCEMENT_SELECT,
  notifyAnnouncement,
  parseAnnouncement,
  toAnnouncementRow,
  userNames,
} from '@/lib/communication-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const access = await requireStaff();
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    let query = access.admin
      .from('announcements')
      .select(ANNOUNCEMENT_SELECT)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500);
    if (access.tenantId) query = query.or(`tenant_id.eq.${access.tenantId},tenant_id.is.null`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []) as Record<string, unknown>[];
    const names = await userNames(
      access.admin,
      rows.map((r) => r.created_by as string | null)
    );
    return NextResponse.json({
      items: rows.map((r) => toAnnouncementRow(r, names)),
      can_manage: isManagerRole(access.role),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load announcements';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireStaff({ manage: true });
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const parsed = parseAnnouncement(await request.json());
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const published = parsed.payload.status === 'published';
    const { data, error } = await access.admin
      .from('announcements')
      .insert({
        ...parsed.payload,
        tenant_id: access.tenantId,
        created_by: access.user.id,
        approved_by: published ? access.user.id : null,
        approved_at: published ? new Date().toISOString() : null,
      })
      .select(ANNOUNCEMENT_SELECT)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const row = toAnnouncementRow(data as Record<string, unknown>, new Map());
    const notified = published ? await notifyAnnouncement(access.admin, row, access.tenantId) : 0;
    return NextResponse.json({ ...row, notified }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create announcement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
