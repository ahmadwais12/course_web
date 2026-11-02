import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/** Signed-in session check, then service-role client so tenant writes can bypass RLS. */
export async function requireBusinessAdmin() {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return { error: 'Sign in required', status: 401 as const };
  return { admin: createSupabaseAdminClient(), user };
}
