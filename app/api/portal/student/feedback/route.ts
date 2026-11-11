import { NextResponse } from 'next/server';
import { portalsForNav } from '@/lib/portals';
import { requirePortalUser } from '@/lib/portal-api';

const FEEDBACK_TYPES = new Set(['general', 'facility', 'teacher', 'course', 'service']);

export async function POST(request: Request) {
  const auth = await requirePortalUser((role) => portalsForNav(role).includes('student'));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { admin, user } = auth;

  try {
    const body = (await request.json()) as {
      feedbackType?: string;
      rating?: number | string | null;
      title?: string;
      comment?: string;
      anonymous?: boolean;
    };

    const feedbackType = FEEDBACK_TYPES.has(String(body.feedbackType))
      ? String(body.feedbackType)
      : 'general';
    const title = String(body.title ?? '').trim();
    const comment = String(body.comment ?? '').trim();
    const parsedRating = Number(body.rating);
    const rating =
      Number.isFinite(parsedRating) && parsedRating >= 1 && parsedRating <= 5
        ? Math.round(parsedRating)
        : null;

    if (!title || !comment) {
      return NextResponse.json({ error: 'Subject and comments are required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('feedback')
      .insert({
        tenant_id: user.tenantId,
        user_id: user.id,
        feedback_type: feedbackType,
        rating,
        title,
        comment,
        is_anonymous: Boolean(body.anonymous),
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit feedback';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
