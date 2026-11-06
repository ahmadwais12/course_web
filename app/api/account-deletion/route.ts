import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requestMeta } from '@/lib/system-access';
import {
  DELETION_SELECT,
  EMAIL_RE,
  clean,
  deletionDbError,
  notifyDeletionReviewers,
} from '@/lib/account-deletion-server';

export const dynamic = 'force-dynamic';

const RECEIVED =
  'Request received. If an account exists for this email, our team will delete it and its personal data, and contact you if anything is unclear.';
const MAX_PER_IP_PER_HOUR = 5;

async function currentUser() {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  return user;
}

/** Signed-in users see their account email and their own requests. Visitors get `signed_in: false`. */
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ signed_in: false, requests: [] });

    const admin = createSupabaseAdminClient();
    const { data: profile } = await admin
      .from('users')
      .select('full_name, email, phone')
      .eq('id', user.id)
      .maybeSingle();

    const { data, error } = await admin
      .from('account_deletion_requests')
      .select(DELETION_SELECT)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) return NextResponse.json({ error: deletionDbError(error) }, { status: 500 });

    return NextResponse.json({
      signed_in: true,
      account: {
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? user.email ?? null,
        phone: profile?.phone ?? null,
      },
      requests: data ?? [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load requests';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Anyone may submit. Signed-in users request deletion of their own account; visitors give the
 * account email. The response never says whether an account exists for that email.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Honeypot: real users never fill the hidden "website" field.
    if (clean(body.website, 200)) return NextResponse.json({ ok: true, message: RECEIVED }, { status: 201 });

    if (body.confirm !== true) {
      return NextResponse.json(
        { error: 'Please confirm that you understand the account will be permanently deleted.' },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const meta = requestMeta(request);
    const user = await currentUser();
    const source = body.source === 'app' ? 'app' : 'web';
    const reason = clean(body.reason, 2000) || null;

    let userId: string | null = null;
    let tenantId: string | null = null;
    let email = clean(body.email, 320).toLowerCase();
    let fullName = clean(body.full_name, 200);
    let phone = clean(body.phone, 40) || null;

    if (user) {
      const { data: profile } = await admin
        .from('users')
        .select('id, full_name, email, phone, tenant_id')
        .eq('id', user.id)
        .maybeSingle();
      userId = user.id;
      tenantId = (profile?.tenant_id as string | null) ?? null;
      email = String(profile?.email || user.email || email).toLowerCase();
      fullName = fullName || String(profile?.full_name || '');
      phone = phone || ((profile?.phone as string | null) ?? null);
    } else {
      if (!fullName) return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
      if (!EMAIL_RE.test(email)) {
        return NextResponse.json({ error: 'Enter the email address you use to sign in.' }, { status: 400 });
      }

      if (meta.ipAddress) {
        const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count } = await admin
          .from('account_deletion_requests')
          .select('id', { count: 'exact', head: true })
          .eq('ip_address', meta.ipAddress)
          .gte('created_at', since);
        if ((count ?? 0) >= MAX_PER_IP_PER_HOUR) {
          return NextResponse.json(
            { error: 'Too many requests from this network. Please try again in an hour.' },
            { status: 429 }
          );
        }
      }

      const { data: match } = await admin
        .from('users')
        .select('id, tenant_id')
        .ilike('email', email.replace(/[\\%_]/g, '\\$&'))
        .limit(1)
        .maybeSingle();
      userId = (match?.id as string | undefined) ?? null;
      tenantId = (match?.tenant_id as string | null | undefined) ?? null;
    }

    if (!email) return NextResponse.json({ error: 'Your account has no email address.' }, { status: 400 });

    const { data: created, error } = await admin
      .from('account_deletion_requests')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        full_name: fullName || null,
        email,
        phone,
        reason,
        source,
        status: 'pending',
        ip_address: meta.ipAddress,
        user_agent: meta.userAgent,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({
          ok: true,
          already_pending: true,
          message: 'A deletion request for this email is already waiting for review.',
        });
      }
      return NextResponse.json({ error: deletionDbError(error) }, { status: 500 });
    }

    await notifyDeletionReviewers(admin, {
      requestId: created.id as string,
      tenantId,
      name: fullName,
      email,
    });

    return NextResponse.json({ ok: true, message: RECEIVED }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Signed-in user cancels their own pending request: `{ id, action: 'cancel' }`. */
export async function PATCH(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const id = clean(body.id, 64);
    if (!id || body.action !== 'cancel') {
      return NextResponse.json({ error: 'Send { id, action: "cancel" }.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('account_deletion_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .select(DELETION_SELECT)
      .maybeSingle();
    if (error) return NextResponse.json({ error: deletionDbError(error) }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'No pending request found to cancel.' }, { status: 404 });

    return NextResponse.json({ ok: true, request: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to cancel request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
