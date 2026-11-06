import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { hydrateNotification } from '@/lib/notifications';

type Params = { params: Promise<{ id: string }> };

async function signedInUserId() {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  return user?.id ?? null;
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const userId = await signedInUserId();
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const isRead = body.is_read !== false;

    const { data, error } = await createSupabaseAdminClient()
      .from('notifications')
      .update({
        is_read: isRead,
        read_at: isRead ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });

    return NextResponse.json(hydrateNotification(data as Record<string, unknown>));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update notification';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const userId = await signedInUserId();
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const { error } = await createSupabaseAdminClient()
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete notification';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
