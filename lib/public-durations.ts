import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  DEFAULT_DURATIONS,
  SETTINGS_KEY,
  hydrateDuration,
  parseStoredDurations,
  type DurationRow,
} from '@/lib/durations';

export type PublicDurationOption = {
  id: string;
  name: string;
  slug: string;
  months: number;
  description: string | null;
};

function toOption(row: DurationRow): PublicDurationOption | null {
  if (!row.is_active || row.status !== 'active') return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    months: row.months,
    description: row.description,
  };
}

/** Active program durations for the public homepage (no sign-in required). */
export async function listPublicDurations(): Promise<PublicDurationOption[]> {
  try {
    const admin = createSupabaseAdminClient();
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
      const items = (table.data ?? [])
        .map((row) => toOption(hydrateDuration(row as Partial<DurationRow>)))
        .filter((row): row is PublicDurationOption => Boolean(row));
      if (items.length) return items;
    }

    const { data } = await admin
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const fromSettings = parseStoredDurations(data?.value)
      .map(toOption)
      .filter((row): row is PublicDurationOption => Boolean(row));
    if (fromSettings.length) return fromSettings;
  } catch {
    /* fall through to defaults */
  }

  return DEFAULT_DURATIONS.map((d) => ({
    id: d.id,
    name: d.name,
    slug: d.slug,
    months: d.months,
    description: d.description,
  }));
}
