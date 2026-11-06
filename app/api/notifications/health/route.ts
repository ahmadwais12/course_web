import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createInAppNotification } from '@/lib/notify';

/**
 * Dev/ops check: verifies notifications table + insert path.
 * Requires a signed-in session. Creates one test row for the current user, then deletes it.
 */
export async function GET() {
  const checks: Record<string, unknown> = {
    auth: false,
    table_readable: false,
    insert_ok: false,
    delete_ok: false,
    realtime_hint: 'already in publication if SQL said so',
    errors: [] as string[],
  };

  try {
    const auth = await createClient();
    const {
      data: { user },
    } = await auth.auth.getUser();

    const admin = createSupabaseAdminClient();

    let userId = user?.id ?? null;
    if (!userId) {
      // Dev-only fallback so we can verify inserts without a browser session.
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ ...checks, error: 'Sign in required' }, { status: 401 });
      }
      const firstUser = await admin.from('users').select('id').limit(1).maybeSingle();
      if (firstUser.error || !firstUser.data?.id) {
        (checks.errors as string[]).push(
          `no session and no users row: ${firstUser.error?.message || 'empty'}`
        );
        return NextResponse.json({ ok: false, ...checks }, { status: 500 });
      }
      userId = String(firstUser.data.id);
      checks.auth = 'dev-fallback';
    } else {
      checks.auth = true;
    }
    checks.user_id = userId;

    const list = await admin
      .from('notifications')
      .select('id, title, body, message, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (list.error) {
      // retry without message column
      const retry = await admin
        .from('notifications')
        .select('id, title, body, is_read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (retry.error) {
        (checks.errors as string[]).push(`select: ${retry.error.message}`);
      } else {
        checks.table_readable = true;
        checks.existing_for_user = retry.data?.length ?? 0;
        checks.sample = retry.data ?? [];
      }
    } else {
      checks.table_readable = true;
      checks.existing_for_user = list.data?.length ?? 0;
      checks.sample = list.data ?? [];
    }

    const created = await createInAppNotification({
      admin,
      userId,
      title: 'Notification health check',
      message: 'If you see this briefly, inserts work. This row is deleted automatically.',
      type: 'system',
      priority: 'low',
      actionUrl: '/notifications',
      data: { health_check: true },
    });

    if (created.error || !created.id) {
      (checks.errors as string[]).push(`insert: ${created.error || 'no id returned'}`);
      checks.insert_skipped = created.skipped;
    } else {
      checks.insert_ok = true;
      checks.inserted_id = created.id;

      const del = await admin.from('notifications').delete().eq('id', created.id);
      if (del.error) {
        (checks.errors as string[]).push(`delete: ${del.error.message}`);
      } else {
        checks.delete_ok = true;
      }
    }

    const ok = Boolean(checks.auth && checks.table_readable && checks.insert_ok && checks.delete_ok);
    return NextResponse.json({ ok, ...checks }, { status: ok ? 200 : 500 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Health check failed';
    (checks.errors as string[]).push(message);
    return NextResponse.json({ ok: false, ...checks }, { status: 500 });
  }
}
