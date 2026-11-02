import { toSlug } from '@/lib/business';

export const BUSINESS_TYPE_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'draft', label: 'Draft' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'archived', label: 'Archived' },
] as const;

export type BusinessTypeStatus = (typeof BUSINESS_TYPE_STATUSES)[number]['value'];

export type BusinessTypeRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: BusinessTypeStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

export const SETTINGS_KEY = 'business_types';

export function isBusinessTypeStatus(value: string): value is BusinessTypeStatus {
  return BUSINESS_TYPE_STATUSES.some((s) => s.value === value);
}

export function normalizeStatus(value: unknown, fallback: BusinessTypeStatus = 'active'): BusinessTypeStatus {
  const raw = String(value ?? '')
    .toLowerCase()
    .trim();
  if (isBusinessTypeStatus(raw)) return raw;
  if (value === true || raw === 'true') return 'active';
  if (value === false || raw === 'false') return 'inactive';
  return fallback;
}

export function hydrateBusinessType(
  row: Partial<BusinessTypeRow> & { id?: string; name?: string; is_active?: boolean | null }
): BusinessTypeRow {
  const status = normalizeStatus(
    row.status,
    row.is_active === false ? 'inactive' : row.is_active === true ? 'active' : 'active'
  );
  const createdAt = row.created_at || new Date().toISOString();
  return {
    id: String(row.id || crypto.randomUUID()),
    name: String(row.name || '').trim(),
    slug: toSlug(String(row.slug || row.name || '')),
    description: row.description ? String(row.description) : null,
    status,
    is_active: row.is_active == null ? status === 'active' : Boolean(row.is_active),
    created_at: createdAt,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

export const DEFAULT_BUSINESS_TYPES: Omit<BusinessTypeRow, 'created_at' | 'updated_at'>[] = [
  { id: 'school', name: 'School', slug: 'school', description: 'Primary or secondary school', status: 'active', is_active: true },
  { id: 'academy', name: 'Academy', slug: 'academy', description: 'Training academy or coaching center', status: 'active', is_active: true },
  { id: 'institute', name: 'Institute', slug: 'institute', description: 'Educational institute', status: 'active', is_active: true },
  { id: 'company', name: 'Company', slug: 'company', description: 'Company or corporate training', status: 'active', is_active: true },
  { id: 'training-center', name: 'Training Center', slug: 'training-center', description: 'Skills and vocational training', status: 'active', is_active: true },
];

export function normalizeBusinessType(body: Record<string, unknown>, existing?: BusinessTypeRow): BusinessTypeRow {
  const name = String(body.name ?? existing?.name ?? '').trim();
  const slug = toSlug(String(body.slug ?? existing?.slug ?? name));
  const status = normalizeStatus(
    body.status ?? (body.is_active === false || body.is_active === 'inactive' ? 'inactive' : existing?.status),
    existing?.status ?? 'active'
  );
  const now = new Date().toISOString();
  return {
    id: existing?.id || crypto.randomUUID(),
    name,
    slug,
    description: body.description != null ? String(body.description).trim() || null : existing?.description ?? null,
    status,
    is_active:
      body.is_active != null
        ? body.is_active === true || body.is_active === 'true' || body.is_active === 'active'
        : status === 'active',
    created_at: existing?.created_at || now,
    updated_at: now,
  };
}

export function parseStoredTypes(value: unknown): BusinessTypeRow[] {
  let parsed: unknown = value;
  if (typeof value === 'string' && value.trim()) {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((row) => hydrateBusinessType(row as Partial<BusinessTypeRow>));
}
