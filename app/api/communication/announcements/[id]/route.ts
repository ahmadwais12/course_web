import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/system-access';
import {
  ANNOUNCEMENT_SELECT,
  notifyAnnouncement,
  parseAnnouncement,
  toAnnouncementRow,
} from '@/lib/communication-server';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const access = await requireStaff({ manage: true });
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { data: existing, error: findError } = await access.admin
      .from('announcements')
      .select('id, status')
      .eq('id', id)
      .maybeSingle();
    if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });

    const parsed = parseAnnouncement(await request.json());
    if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const nowPublished = parsed.payload.status === 'published' && existing.status !== 'published';
    const now = new Date().toISOString();
    const { data, error } = await access.admin
      .from('announcements')
      .update({
        ...parsed.payload,
        updated_at: now,
        ...(nowPublished ? { approved_by: access.user.id, approved_at: now } : {}),
      })
      .eq('id', id)
      .select(ANNOUNCEMENT_SELECT)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const row = toAnnouncementRow(data as Record<string, unknown>, new Map());
    const notified = nowPublished ? await notifyAnnouncement(access.admin, row, access.tenantId) : 0;
    return NextResponse.json({ ...row, notified });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update announcement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const access = await requireStaff({ manage: true });
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { error } = await access.admin.from('announcements').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete announcement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
