import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function normalizeRole(role?: string | null) {
  if (!role) return 'student';
  if (role === 'super_admin') return 'superadmin';
  return role;
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = normalizeRole(user.user_metadata?.role);
    const fullName =
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'User';

    const { data: existing, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    let profile = existing;

    if (!profile) {
      const { data: created, error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          role: role === 'superadmin' ? 'super_admin' : role,
          is_active: true,
        })
        .select('*')
        .single();

      if (insertError) {
        // Profile may already exist via trigger; fall back to auth metadata
        return NextResponse.json({
          id: user.id,
          supabaseId: user.id,
          email: user.email,
          name: fullName,
          role,
        });
      }
      profile = created;
    }

    return NextResponse.json({
      id: profile.id,
      supabaseId: profile.id,
      email: profile.email ?? user.email,
      name: profile.full_name ?? fullName,
      role: normalizeRole(profile.role ?? role),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
