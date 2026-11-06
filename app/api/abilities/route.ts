import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { loadUserAbilities } from '@/lib/abilities-server';

/** KMS-style GET /abilities ? flat permission name strings for the current user */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json([], { status: 200 });

    const { abilities, error } = await loadUserAbilities(
      supabase as unknown as SupabaseClient,
      user.id
    );
    if (error) {
      return NextResponse.json(['Team', 'Dashboard', 'User Management', 'Roles', 'Permissions', 'Create Users']);
    }
    return NextResponse.json(abilities);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load abilities';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
