import { NextResponse } from 'next/server';
import { isManagerRole, requireSignedInAdmin } from '@/lib/system-access';
import { FEEDBACK_SELECT, toFeedbackRow, userNames } from '@/lib/communication-server';
import { FEEDBACK_TYPES } from '@/lib/communication';

export const dynamic = 'force-dynamic';

const NON_STAFF = new Set(['student', 'guardian', 'parent']);

/** Staff see all feedback in their tenant; students / guardians see only their own. */
export async function GET() {
  try {
    const access = await requireSignedInAdmin();
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const isStaff = Boolean(access.role && !NON_STAFF.has(access.role));

    let query = access.admin
      .from('feedback')
      .select(FEEDBACK_SELECT)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (!isStaff) query = query.eq('user_id', access.user.id);
    else if (access.tenantId) query = query.or(`tenant_id.eq.${access.tenantId},tenant_id.is.null`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []) as Record<string, unknown>[];
    const names = await userNames(
      access.admin,
      rows.flatMap((r) => [r.user_id as string | null, r.responded_by as string | null])
    );
    return NextResponse.json({
      items: rows.map((r) => toFeedbackRow(r, names)),
      can_respond: isStaff,
      can_delete: isManagerRole(access.role),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load feedback';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Any signed-in user can leave feedback. */
export async function POST(request: Request) {
  try {
    const access = await requireSignedInAdmin();
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const comment = String(body.comment ?? '').trim();
    if (!comment) return NextResponse.json({ error: 'Feedback text is required' }, { status: 400 });

    const rating = Number(body.rating);
    const type = FEEDBACK_TYPES.some((t) => t.value === body.feedback_type)
      ? String(body.feedback_type)
      : 'general';

    const { data, error } = await access.admin
      .from('feedback')
      .insert({
        tenant_id: access.tenantId,
        user_id: access.user.id,
        feedback_type: type,
        rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
        title: String(body.title ?? '').trim() || null,
        comment,
        is_anonymous: Boolean(body.is_anonymous),
        status: 'pending',
      })
      .select(FEEDBACK_SELECT)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const names = await userNames(access.admin, [access.user.id]);
    return NextResponse.json(toFeedbackRow(data as Record<string, unknown>, names), { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit feedback';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
