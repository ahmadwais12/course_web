import type { createSupabaseAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type NotifyInput = {
  admin: AdminClient;
  userId: string;
  title: string;
  message: string;
  tenantId?: string | null;
  type?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string | null;
  data?: Record<string, unknown> | null;
};

/** Insert one in-app notification (service role). Realtime delivers to open clients. */
export async function createInAppNotification(input: NotifyInput) {
  const base = {
    user_id: input.userId,
    tenant_id: input.tenantId ?? null,
    title: input.title.trim(),
    type: input.type || 'general',
    priority: input.priority || 'normal',
    action_url: input.actionUrl || null,
    data: input.data ?? {},
    is_read: false,
  };
  const text = input.message.trim();

  // Live EMIS schema uses `body`; our migration used `message`. Try body first.
  let result = await input.admin
    .from('notifications')
    .insert({ ...base, body: text })
    .select('id')
    .single();

  if (result.error && /body|message|column|PGRST204/i.test(result.error.message)) {
    result = await input.admin
      .from('notifications')
      .insert({ ...base, message: text })
      .select('id')
      .single();
  }

  if (result.error) {
    // Table may not exist until migration — never break primary flows
    if (/notifications|42P01|schema cache/i.test(result.error.message)) {
      return { id: null as string | null, skipped: true as const, error: result.error.message };
    }
    return { id: null as string | null, skipped: false as const, error: result.error.message };
  }
  return { id: result.data?.id ? String(result.data.id) : null, skipped: false as const, error: null };
}
