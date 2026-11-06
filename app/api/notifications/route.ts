import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createInAppNotification } from '@/lib/notify';
import { hydrateNotification } from '@/lib/notifications';
import { isManagerRole } from '@/lib/system-access';
import { audienceRecipients, notifyUsers } from '@/lib/communication-server';
import { isAudience } from '@/lib/communication';

const PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);

/** Signed-in user's notifications. Reads with the service role, always filtered to the caller. */
export async function GET(request: Request) {
  try {
    const auth = await createClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unread') === '1';
    const limit = Math.min(Number(url.searchParams.get('limit') || 40) || 40, 100);

    const admin = createSupabaseAdminClient();
    let query = admin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) query = query.eq('is_read', false);

    const { data, error } = await query;
    if (error) {
      if (/notifications|42P01|schema cache/i.test(error.message)) {
        return NextResponse.json({ items: [], unread: 0, missing_table: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (data ?? []).map((row) => hydrateNotification(row as Record<string, unknown>));

    const [{ count }, { data: profile }] = await Promise.all([
      admin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false),
      admin.from('users').select('role').eq('id', user.id).maybeSingle(),
    ]);

    return NextResponse.json({
      items,
      unread: typeof count === 'number' ? count : items.filter((n) => !n.is_read).length,
      can_send: isManagerRole(profile?.role as string | null),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load notifications';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Create notifications. `audience` sends to a whole group; `user_id` targets one user.
 * Sending to anyone other than yourself requires an admin role.
 */
export async function POST(request: Request) {
  try {
    const auth = await createClient();
    const {
      data: { user: actor },
    } = await auth.auth.getUser();
    if (!actor) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const body = await request.json();
    const title = String(body.title ?? '').trim();
    const message = String(body.message ?? body.body ?? '').trim();
    if (!title || !message) {
      return NextResponse.json({ error: 'title and message are required' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: actorRow } = await admin
      .from('users')
      .select('tenant_id, role')
      .eq('id', actor.id)
      .maybeSingle();
    const tenantId = (actorRow?.tenant_id as string | null) ?? null;
    const canSend = isManagerRole(actorRow?.role as string | null);
    const priority = PRIORITIES.has(body.priority) ? String(body.priority) : 'normal';
    const type = String(body.type || 'general');
    const actionUrl = body.action_url ? String(body.action_url) : null;

    if (body.audience !== undefined && body.audience !== null && body.audience !== '') {
      if (!canSend) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      if (!isAudience(body.audience)) {
        return NextResponse.json({ error: 'Invalid audience' }, { status: 400 });
      }
      const recipients = await audienceRecipients(admin, body.audience, tenantId);
      const sent = await notifyUsers(
        admin,
        recipients.map((r) => r.id),
        { title, message, tenantId, type, priority, actionUrl, data: { actor_id: actor.id } }
      );
      return NextResponse.json({ sent }, { status: 201 });
    }

    const targetUserId = String(body.user_id ?? actor.id).trim();
    if (targetUserId !== actor.id && !canSend) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const result = await createInAppNotification({
      admin,
      userId: targetUserId,
      tenantId,
      title,
      message,
      type,
      priority: priority as 'low' | 'normal' | 'high' | 'urgent',
      actionUrl,
      data: body.data && typeof body.data === 'object' ? body.data : { actor_id: actor.id },
    });

    if (result.skipped) {
      return NextResponse.json(
        { error: 'Notifications table missing. Apply migration 20261103_notifications.sql' },
        { status: 500 }
      );
    }
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ id: result.id, sent: 1 }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create notification';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
