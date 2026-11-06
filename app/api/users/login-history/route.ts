import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { recordLoginEvent, type LoginEventType, type LoginHistoryRow } from '@/lib/login-history';
import { requireSignedInAdmin, requireSystemAdmin, requestMeta } from '@/lib/system-access';

export const dynamic = 'force-dynamic';

const EVENT_TYPES = new Set<LoginEventType>(['login', 'logout', 'failed_login']);

/** GET login history — system admins see all; other signed-in users see their own rows. */
export async function GET(request: Request) {
  try {
    const access = await requireSignedInAdmin();
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(request.url);
    const eventType = (searchParams.get('event_type') || '').trim();
    const userId = (searchParams.get('user_id') || '').trim();
    const from = (searchParams.get('from') || '').trim();
    const to = (searchParams.get('to') || '').trim();
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 500), 1), 1000);

    const isSystemAdmin = access.role === 'super_admin' || access.role === 'ceo';

    let query = access.admin
      .from('login_history')
      .select(
        'id, nid, tenant_id, user_id, email, event_type, success, ip_address, user_agent, device_type, device_name, browser, os, location, details, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!isSystemAdmin) {
      query = query.eq('user_id', access.user.id);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    if (eventType && EVENT_TYPES.has(eventType as LoginEventType)) {
      query = query.eq('event_type', eventType);
    }
    if (from) query = query.gte('created_at', `${from}T00:00:00.000Z`);
    if (to) query = query.lte('created_at', `${to}T23:59:59.999Z`);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json(
        {
          error:
            error.message.includes('login_history') || error.code === '42P01'
              ? 'Login history table missing. Apply migration 20261105_login_history.sql'
              : error.message,
        },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as LoginHistoryRow[];
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
      }))
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load login history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST — record a login event.
 * - login / logout: requires signed-in user (or system admin acting for another user_id)
 * - failed_login: open (no session); records email + IP for security review
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const eventType = String(body.event_type ?? body.event ?? '').trim() as LoginEventType;
    if (!EVENT_TYPES.has(eventType)) {
      return NextResponse.json(
        { error: 'event_type must be login, logout, or failed_login' },
        { status: 400 }
      );
    }

    const meta = requestMeta(request);
    const email = body.email ? String(body.email).trim().toLowerCase() : null;
    const details =
      body.details && typeof body.details === 'object'
        ? (body.details as Record<string, unknown>)
        : null;

    if (eventType === 'failed_login') {
      if (!email) {
        return NextResponse.json({ error: 'email is required for failed_login' }, { status: 400 });
      }
      const admin = createSupabaseAdminClient();
      await recordLoginEvent({
        admin,
        eventType: 'failed_login',
        email,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        details: details ?? { source: 'login_form' },
      });
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    const access = await requireSignedInAdmin();
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    let userId = access.user.id;
    let tenantId = access.tenantId;
    let recordEmail = access.user.email ?? email;

    const targetUserId = body.user_id ? String(body.user_id).trim() : '';
    if (targetUserId && targetUserId !== access.user.id) {
      const elevated = await requireSystemAdmin();
      if ('error' in elevated) {
        return NextResponse.json({ error: elevated.error }, { status: elevated.status });
      }
      userId = targetUserId;
      const { data: profile } = await access.admin
        .from('users')
        .select('id, email, tenant_id')
        .eq('id', targetUserId)
        .maybeSingle();
      tenantId = (profile?.tenant_id as string | null) ?? null;
      recordEmail = (profile?.email as string | null) ?? email;
    }

    await recordLoginEvent({
      admin: access.admin,
      eventType,
      userId,
      tenantId,
      email: recordEmail,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      details,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record login event';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
