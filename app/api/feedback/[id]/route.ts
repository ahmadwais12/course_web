import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/system-access';
import { FEEDBACK_SELECT, notifyUsers, toFeedbackRow, userNames } from '@/lib/communication-server';
import { FEEDBACK_STATUSES } from '@/lib/communication';

type Params = { params: Promise<{ id: string }> };

/** Staff update status and / or reply. A new reply notifies the author in the app. */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const access = await requireStaff();
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { data: existing, error: findError } = await access.admin
      .from('feedback')
      .select('id, user_id, title, response')
      .eq('id', id)
      .maybeSingle();
    if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });

    const body = await request.json();
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: now };

    if (body.status !== undefined) {
      if (!FEEDBACK_STATUSES.some((s) => s.value === body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      patch.status = body.status;
    }

    const response = body.response === undefined ? undefined : String(body.response ?? '').trim();
    const isNewReply = Boolean(response) && response !== (existing.response ?? '');
    if (response !== undefined) {
      patch.response = response || null;
      if (isNewReply) {
        patch.responded_by = access.user.id;
        patch.responded_at = now;
        if (body.status === undefined) patch.status = 'reviewed';
      }
    }

    const { data, error } = await access.admin
      .from('feedback')
      .update(patch)
      .eq('id', id)
      .select(FEEDBACK_SELECT)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (isNewReply && existing.user_id) {
      await notifyUsers(access.admin, [String(existing.user_id)], {
        title: 'Reply to your feedback',
        message: existing.title ? `${existing.title}: ${response}` : String(response),
        tenantId: access.tenantId,
        type: 'general',
        actionUrl: '/feedback',
        data: { feedback_id: id },
      }).catch(() => 0);
    }

    const row = data as Record<string, unknown>;
    const names = await userNames(access.admin, [row.user_id as string | null, row.responded_by as string | null]);
    return NextResponse.json(toFeedbackRow(row, names));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update feedback';
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
    const { error } = await access.admin.from('feedback').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete feedback';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
