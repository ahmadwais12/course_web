import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

/**
 * KMS: POST /admin/change/password
 * Body: { uuid, password, password_confirmation? }
 * Uses Supabase Auth Admin API with service role key.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const uuid = String(body.uuid ?? '').trim();
    const password = String(body.password ?? body.new_password ?? '');
    const confirmation = String(
      body.password_confirmation ?? body.passwordConfirmation ?? password
    );

    if (!uuid || !password) {
      return NextResponse.json({ error: 'uuid and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    if (password !== confirmation) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    const server = await createServerClient();
    const {
      data: { user },
    } = await server.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE ||
      '';
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      '';

    if (!serviceKey || !url) {
      return NextResponse.json(
        {
          error:
            'Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE) in server env.',
        },
        { status: 501 }
      );
    }

    // Same approach as KMS UserController::adminChangePassword
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await admin.auth.admin.updateUserById(uuid, {
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Password updated successfully',
      user_id: data.user?.id ?? uuid,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Password update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
