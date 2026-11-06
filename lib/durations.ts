import { toSlug } from '@/lib/business';

export const DURATION_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
] as const;

export type DurationStatus = (typeof DURATION_STATUSES)[number]['value'];

export type DurationRow = {
  id: string;
  name: string;
  slug: string;
  months: number;
  description: string | null;
  sort_order: number;
  status: DurationStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

export const SETTINGS_KEY = 'durations';

export const DEFAULT_DURATIONS: Omit<DurationRow, 'created_at' | 'updated_at'>[] = [
  {
    id: '4-months',
    name: '4 Months',
    slug: '4-months',
    months: 4,
    description: 'Short program duration',
    sort_order: 10,
    status: 'active',
    is_active: true,
  },
  {
    id: '6-months',
    name: '6 Months',
    slug: '6-months',
    months: 6,
    description: 'Standard program duration',
    sort_order: 20,
    status: 'active',
    is_active: true,
  },
  {
    id: '12-months',
    name: '12 Months',
    slug: '12-months',
    months: 12,
    description: 'Full-year program duration',
    sort_order: 30,
    status: 'active',
    is_active: true,
  },
];

function normalizeStatus(value: unknown, fallback: DurationStatus = 'active'): DurationStatus {
  const raw = String(value ?? '').toLowerCase().trim();
  if (DURATION_STATUSES.some((s) => s.value === raw)) return raw as DurationStatus;
  if (value === false || raw === 'false') return 'inactive';
  return fallback;
}

export function hydrateDuration(
  row: Partial<DurationRow> & { id?: string; name?: string; is_active?: boolean | null }
): DurationRow {
  const status = normalizeStatus(
    row.status,
    row.is_active === false ? 'inactive' : 'active'
  );
  const months = Number(row.months);
  return {
    id: String(row.id || crypto.randomUUID()),
    name: String(row.name || '').trim(),
    slug: toSlug(String(row.slug || row.name || '')),
    months: Number.isFinite(months) && months > 0 ? months : 1,
    description: row.description ? String(row.description) : null,
    sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
    status,
    is_active: row.is_active == null ? status === 'active' : Boolean(row.is_active),
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

export function normalizeDuration(
  body: Record<string, unknown>,
  existing?: DurationRow
): DurationRow {
  const name = String(body.name ?? existing?.name ?? '').trim();
  const months = Number(body.months ?? existing?.months ?? 0);
  const status = normalizeStatus(
    body.status ?? (body.is_active === false ? 'inactive' : existing?.status),
    existing?.status ?? 'active'
  );
  const now = new Date().toISOString();
  return {
    id: existing?.id || crypto.randomUUID(),
    name,
    slug: toSlug(String(body.slug ?? existing?.slug ?? name)),
    months: Number.isFinite(months) && months > 0 ? months : existing?.months || 1,
    description:
      body.description != null
        ? String(body.description).trim() || null
        : existing?.description ?? null,
    sort_order: Number(body.sort_order ?? existing?.sort_order ?? 0) || 0,
    status,
    is_active:
      body.is_active != null
        ? body.is_active === true || body.is_active === 'true' || body.is_active === 'active'
        : status === 'active',
    created_at: existing?.created_at || now,
    updated_at: now,
  };
}

export function parseStoredDurations(value: unknown): DurationRow[] {
  let parsed: unknown = value;
  if (typeof value === 'string' && value.trim()) {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((row) => hydrateDuration(row as Partial<DurationRow>));
}
