import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  DEFAULT_BUSINESS_PLANS,
  SETTINGS_KEY,
  hydrateBusinessPlan,
  parseStoredPlans,
  planTablePayload,
  type BusinessPlanRow,
} from '@/lib/business-plans';

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type PlansStore = {
  admin: AdminClient;
  userId: string;
  tenantId: string | null;
  source: 'table' | 'settings';
  items: BusinessPlanRow[];
  rowId?: string;
};

function tableMissing(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === '42P01' || /does not exist|schema cache/i.test(error.message || '');
}

export async function requireBusinessPlansStore(): Promise<
  PlansStore | { error: string; status: number }
> {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return { error: 'Sign in required', status: 401 };

  const admin = createSupabaseAdminClient();
  const tenantId = await resolveTenantId(admin, user.id);
  const loaded = await loadPlans(admin, tenantId);

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
  return { rowId: data?.id as string | undefined, items: parseStoredPlans(data?.value) };
}

export async function saveToSettings(
  admin: AdminClient,
  items: BusinessPlanRow[],
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

async function loadPlans(admin: AdminClient, tenantId: string | null) {
  let table = await admin
    .from('business_plans')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order')
    .order('name');
  if (table.error && /deleted_at/i.test(table.error.message)) {
    table = await admin.from('business_plans').select('*').order('sort_order').order('name');
  }
  if (!table.error) {
    return {
      source: 'table' as const,
      items: (table.data ?? []).map((row) => hydrateBusinessPlan(row as Partial<BusinessPlanRow>)),
    };
  }
  if (!tableMissing(table.error)) {
    if (/sort_order/i.test(table.error.message || '')) {
      const fallback = await admin.from('business_plans').select('*').order('name');
      if (!fallback.error) {
        return {
          source: 'table' as const,
          items: (fallback.data ?? []).map((row) =>
            hydrateBusinessPlan(row as Partial<BusinessPlanRow>)
          ),
        };
      }
    }
    throw new Error(table.error.message);
  }

  const settings = await loadFromSettings(admin, tenantId);
  return { source: 'settings' as const, items: settings.items, rowId: settings.rowId };
}

export async function seedIfEmpty(store: PlansStore) {
  if (store.items.length > 0) return store.items;

  const now = new Date().toISOString();
  const seeded: BusinessPlanRow[] = DEFAULT_BUSINESS_PLANS.map((item) => ({
    ...item,
    created_at: now,
    updated_at: now,
  }));

  if (store.source === 'table') {
    const { error } = await store.admin
      .from('business_plans')
      .insert(seeded.map((item) => planTablePayload(item)));
    if (error) throw new Error(error.message);
    return seeded;
  }

  await saveToSettings(store.admin, seeded, store.tenantId, store.rowId);
  return seeded;
}

export function isStoreError(
  value: PlansStore | { error: string; status: number }
): value is { error: string; status: number } {
  return 'error' in value && 'status' in value && !('admin' in value);
}
