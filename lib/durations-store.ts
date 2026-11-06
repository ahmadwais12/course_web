import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  DEFAULT_DURATIONS,
  SETTINGS_KEY,
  hydrateDuration,
  parseStoredDurations,
  type DurationRow,
} from '@/lib/durations';

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type DurationsStore = {
  admin: AdminClient;
  userId: string;
  tenantId: string | null;
  source: 'table' | 'settings';
  items: DurationRow[];
  rowId?: string;
};

function tableMissing(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === '42P01' || /does not exist|schema cache|PGRST205/i.test(error.message || '');
}

export async function requireDurationsStore(): Promise<
  DurationsStore | { error: string; status: number }
> {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return { error: 'Sign in required', status: 401 };

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle();
  const tenantId = profile?.tenant_id ? String(profile.tenant_id) : null;
  const loaded = await loadDurations(admin, tenantId);

  return { admin, userId: user.id, tenantId, ...loaded };
}

async function loadFromSettings(admin: AdminClient, tenantId: string | null) {
  let query = admin.from('settings').select('id, value').eq('key', SETTINGS_KEY);
  query = tenantId ? query.eq('tenant_id', tenantId) : query.is('tenant_id', null);
  const { data, error } = await query.order('updated_at', { ascending: false }).limit(1).maybeSingle();
  if (error && !tableMissing(error)) throw new Error(error.message);
  return { rowId: data?.id as string | undefined, items: parseStoredDurations(data?.value) };
}

export async function saveToSettings(
  admin: AdminClient,
  items: DurationRow[],
  tenantId: string | null,
  rowId?: string
) {
  const payload = {
    key: SETTINGS_KEY,
    value: JSON.stringify(items),
    category: 'ports',
    tenant_id: tenantId,
    updated_at: new Date().toISOString(),
  };
  if (rowId) {
    const { error } = await admin.from('settings').update(payload).eq('id', rowId);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await admin.from('settings').insert({
    ...payload,
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

async function loadDurations(admin: AdminClient, tenantId: string | null) {
  let table = await admin
    .from('durations')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('months', { ascending: true });
  if (table.error && /deleted_at/i.test(table.error.message)) {
    table = await admin
      .from('durations')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('months', { ascending: true });
  }
  if (!table.error) {
    return {
      source: 'table' as const,
      items: (table.data ?? []).map((row) => hydrateDuration(row as Partial<DurationRow>)),
    };
  }
  if (!tableMissing(table.error)) throw new Error(table.error.message);
  const settings = await loadFromSettings(admin, tenantId);
  return { source: 'settings' as const, items: settings.items, rowId: settings.rowId };
}

export async function seedIfEmpty(store: DurationsStore) {
  if (store.items.length > 0) return store.items;
  const now = new Date().toISOString();
  const seeded: DurationRow[] = DEFAULT_DURATIONS.map((d) => ({
    ...d,
    created_at: now,
    updated_at: now,
  }));

  if (store.source === 'table') {
    const { error } = await store.admin.from('durations').insert(
      seeded.map(({ name, slug, months, description, sort_order, status, is_active }) => ({
        name,
        slug,
        months,
        description,
        sort_order,
        status,
        is_active,
      }))
    );
    if (error) throw new Error(error.message);
    return seeded;
  }

  await saveToSettings(store.admin, seeded, store.tenantId, store.rowId);
  return seeded;
}

export function isStoreError(
  value: DurationsStore | { error: string; status: number }
): value is { error: string; status: number } {
  return 'error' in value && 'status' in value && !('admin' in value);
}
