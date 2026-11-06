import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  try {
    const auth = await createClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const now = new Date().toISOString();
    const { error } = await createSupabaseAdminClient()
      .from('notifications')
      .update({ is_read: true, read_at: now, updated_at: now })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      if (/notifications|42P01|schema cache/i.test(error.message)) {
        return NextResponse.json({ ok: true, missing_table: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to mark notifications read';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
