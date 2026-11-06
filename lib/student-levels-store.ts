import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  DEFAULT_STUDENT_LEVELS,
  SETTINGS_KEY,
  hydrateStudentLevel,
  parseStoredLevels,
  type StudentLevelRow,
} from '@/lib/student-levels';

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type StudentLevelsStore = {
  admin: AdminClient;
  userId: string;
  tenantId: string | null;
  source: 'table' | 'settings';
  items: StudentLevelRow[];
  rowId?: string;
};

function tableMissing(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === '42P01' || /does not exist|schema cache/i.test(error.message || '');
}

export async function requireStudentLevelsStore(): Promise<
  StudentLevelsStore | { error: string; status: number }
> {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return { error: 'Sign in required', status: 401 };

  const admin = createSupabaseAdminClient();
  const tenantId = await resolveTenantId(admin, user.id);
  const loaded = await loadLevels(admin, tenantId);

  return {
    admin,
    userId: user.id,
    tenantId,
    ...loaded,
  };
}

async function resolveTenantId(admin: AdminClient, userId: string) {
  const { data: user } = await admin.from('users').select('tenant_id').eq('id', userId).maybeSingle();
  if (user?.tenant_id) return String(user.tenant_id);

  const { data: profile } = await admin
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .maybeSingle();
  return profile?.tenant_id ? String(profile.tenant_id) : null;
}

async function loadFromSettings(admin: AdminClient, tenantId: string | null) {
  let query = admin.from('settings').select('id, value').eq('key', SETTINGS_KEY);
  query = tenantId ? query.eq('tenant_id', tenantId) : query.is('tenant_id', null);

  const { data, error } = await query
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && !tableMissing(error)) throw new Error(error.message);
  return { rowId: data?.id as string | undefined, items: parseStoredLevels(data?.value) };
}

export async function saveToSettings(
  admin: AdminClient,
  items: StudentLevelRow[],
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

async function loadLevels(admin: AdminClient, tenantId: string | null) {
  let table = await admin
    .from('student_levels')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (table.error && /deleted_at/i.test(table.error.message)) {
    table = await admin
      .from('student_levels')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
  }
  if (!table.error) {
    return {
      source: 'table' as const,
      items: (table.data ?? []).map((row) => hydrateStudentLevel(row as Partial<StudentLevelRow>)),
    };
  }
  if (!tableMissing(table.error)) throw new Error(table.error.message);

  const settings = await loadFromSettings(admin, tenantId);
  return { source: 'settings' as const, items: settings.items, rowId: settings.rowId };
}

export async function seedIfEmpty(store: StudentLevelsStore) {
  if (store.items.length > 0) return store.items;

  const now = new Date().toISOString();
  const seeded: StudentLevelRow[] = DEFAULT_STUDENT_LEVELS.map((t) => ({
    ...t,
    created_at: now,
    updated_at: now,
  }));

  if (store.source === 'table') {
    const { error } = await store.admin.from('student_levels').insert(
      seeded.map(({ name, slug, description, sort_order, status, is_active }) => ({
        name,
        slug,
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
  value: StudentLevelsStore | { error: string; status: number }
): value is { error: string; status: number } {
  return 'error' in value && 'status' in value && !('admin' in value);
}
