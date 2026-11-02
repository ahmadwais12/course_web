import { AFGHANISTAN_CITIES } from '@/lib/cities';

/** Business = central tenant; Branch = child tenant under a business. */

export type OrganizationType = 'central' | 'branch';

export const BUSINESS_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

export type BusinessStatus = (typeof BUSINESS_STATUSES)[number]['value'];

export function isBusinessStatus(value: string): value is BusinessStatus {
  return BUSINESS_STATUSES.some((item) => item.value === value);
}

export function normalizeBusinessStatus(
  value: unknown,
  fallback: BusinessStatus = 'pending'
): BusinessStatus {
  const raw = String(value ?? '')
    .toLowerCase()
    .trim();
  if (isBusinessStatus(raw)) return raw;
  if (value === true || raw === 'true') return 'active';
  if (value === false || raw === 'false') return 'inactive';
  return fallback;
}

export function businessStatusFromRow(row: {
  status?: string | null;
  is_active?: boolean | null;
  settings?: Record<string, unknown> | null;
}): BusinessStatus {
  const fromSettings = row.settings?.status;
  const raw = typeof fromSettings === 'string' ? fromSettings : row.status;
  if (raw) {
    return normalizeBusinessStatus(raw, row.is_active === false ? 'inactive' : 'active');
  }
  return row.is_active === false ? 'inactive' : 'active';
}

export type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  tenant_code: string | null;
  organization_type: OrganizationType;
  parent_tenant_id: string | null;
  parent_name?: string | null;
  description: string | null;
  bio?: string | null;
  tagline?: string | null;
  website: string | null;
  address: string | null;
  city?: string | null;
  country?: string | null;
  services?: string[];
  working_hours?: Record<string, unknown> | string | null;
  working_hours_display?: string;
  latitude?: number | null;
  longitude?: number | null;
  phone: string | null;
  email: string | null;
  plan: string | null;
  status?: BusinessStatus;
  is_active: boolean | null;
  logo_url?: string | null;
  cover_url?: string | null;
  business_type_id?: string | null;
  business_type_name?: string | null;
  business_type_slug?: string | null;
  settings?: Record<string, unknown> | null;
  max_users?: number | null;
  created_at?: string | null;
  branch_count?: number;
  status_notes?: StatusNote[];
  description_text?: string;
};

export type StatusNote = {
  text: string;
  status: BusinessStatus;
  from?: BusinessStatus | null;
  at: string;
};

export function statusNotesFromRow(row: {
  description?: string | null;
  settings?: Record<string, unknown> | null;
}): StatusNote[] {
  const raw = row.settings?.status_notes;
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'string') {
          const text = item.trim();
          return text ? { text, status: 'pending' as const, at: '' } : null;
        }
        if (!item || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        const text = String(record.text ?? '').trim();
        if (!text) return null;
        return {
          text,
          status: normalizeBusinessStatus(record.status),
          from: record.from ? normalizeBusinessStatus(record.from) : null,
          at: typeof record.at === 'string' ? record.at : '',
        };
      })
      .filter((item): item is StatusNote => Boolean(item));
  }
  const fallback = String(row.description ?? '').trim();
  return fallback ? [{ text: fallback, status: 'pending', at: '' }] : [];
}

export function descriptionTextFromNotes(notes: StatusNote[]): string {
  return notes.map((note) => note.text).filter(Boolean).join('\n');
}

export function appendStatusNote(
  settings: Record<string, unknown> | null | undefined,
  note: StatusNote,
  description?: string | null
): Record<string, unknown> {
  const current = statusNotesFromRow({ settings: settings ?? null, description });
  return {
    ...(settings ?? {}),
    status_notes: [...current, note],
  };
}

export const BUSINESS_SELECT =
  'id, name, slug, tenant_code, organization_type, parent_tenant_id, description, website, address, phone, email, plan, is_active, logo_url, settings, max_users, created_at, working_hours, services, latitude, longitude';

const OPTIONAL_PROFILE_COLUMNS = ['bio', 'tagline', 'city', 'country'] as const;

export function textOrNull(value: unknown): string | null {
  const text = value == null ? '' : String(value).trim();
  return text || null;
}

export function parseServices(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,|\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function parseWorkingHours(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  const display = textOrNull(value);
  return display ? { display } : {};
}

export function workingHoursDisplayFromRow(row: {
  working_hours?: Record<string, unknown> | string | null;
  settings?: Record<string, unknown> | null;
}): string {
  const hours = row.working_hours ?? row.settings?.working_hours;
  if (typeof hours === 'string') return hours.trim();
  if (hours && typeof hours === 'object' && !Array.isArray(hours)) {
    const display = hours.display;
    if (typeof display === 'string' && display.trim()) return display.trim();
  }
  return '';
}

export function servicesFromRow(row: {
  services?: unknown;
  settings?: Record<string, unknown> | null;
}): string[] {
  const fromColumn = parseServices(row.services);
  if (fromColumn.length) return fromColumn;
  return parseServices(row.settings?.services);
}

export function profileFieldFromRow(
  row: { settings?: Record<string, unknown> | null } & Record<string, unknown>,
  key: 'bio' | 'tagline' | 'city' | 'country'
): string | null {
  const direct = textOrNull(row[key]);
  if (direct) return direct;
  return textOrNull(row.settings?.[key]);
}

export function optionalTenantColumns(body: Record<string, unknown>): Record<string, string | null> {
  const next: Record<string, string | null> = {};
  for (const key of OPTIONAL_PROFILE_COLUMNS) {
    if (key in body) next[key] = textOrNull(body[key]);
  }
  return next;
}

export function withoutMissingProfileColumns<T extends Record<string, unknown>>(
  payload: T,
  errorMessage: string
): T {
  const next = { ...payload };
  for (const key of OPTIONAL_PROFILE_COLUMNS) {
    if (new RegExp(key, 'i').test(errorMessage)) {
      delete next[key];
    }
  }
  return next;
}

export function coverUrlFromRow(row: {
  cover_url?: string | null;
  settings?: Record<string, unknown> | null;
}): string | null {
  if (row.cover_url) return row.cover_url;
  const fromSettings = row.settings?.cover_url;
  return typeof fromSettings === 'string' && fromSettings.trim() ? fromSettings : null;
}

export function withCoverUrl<T extends { cover_url?: string | null; settings?: Record<string, unknown> | null }>(
  row: T
): T & { cover_url: string | null } {
  return { ...row, cover_url: coverUrlFromRow(row) };
}

export function businessTypeFromRow(row: {
  business_type_id?: string | null;
  business_type_name?: string | null;
  business_type_slug?: string | null;
  settings?: Record<string, unknown> | null;
}) {
  const settings = row.settings ?? {};
  const id =
    row.business_type_id ||
    (typeof settings.business_type_id === 'string' ? settings.business_type_id : null);
  const name =
    row.business_type_name ||
    (typeof settings.business_type_name === 'string' ? settings.business_type_name : null);
  const slug =
    row.business_type_slug ||
    (typeof settings.business_type_slug === 'string' ? settings.business_type_slug : null);
  return { business_type_id: id, business_type_name: name, business_type_slug: slug };
}

export function withBusinessMeta<T extends {
  cover_url?: string | null;
  business_type_id?: string | null;
  business_type_name?: string | null;
  business_type_slug?: string | null;
  settings?: Record<string, unknown> | null;
}>(row: T) {
  const status = businessStatusFromRow(row);
  const status_notes = statusNotesFromRow(row);
  const record = row as T & Record<string, unknown>;
  return {
    ...row,
    cover_url: coverUrlFromRow(row),
    ...businessTypeFromRow(row),
    status,
    is_active: status === 'active',
    status_notes,
    description_text: descriptionTextFromNotes(status_notes),
    bio: profileFieldFromRow(record, 'bio'),
    tagline: profileFieldFromRow(record, 'tagline'),
    city: profileFieldFromRow(record, 'city'),
    country: profileFieldFromRow(record, 'country'),
    services: servicesFromRow(record),
    working_hours_display: workingHoursDisplayFromRow(record),
  };
}

export function formatBusinessCode(sequence: number): string {
  return `BIZ-${String(sequence).padStart(4, '0')}`;
}

export function formatBranchCode(parentCode: string, sequence: number): string {
  const base = parentCode.trim().toUpperCase() || 'BIZ-0000';
  return `${base}-B${String(sequence).padStart(2, '0')}`;
}

function nextSequence(codes: string[], pattern: RegExp): number {
  let max = 0;
  for (const code of codes) {
    const match = code.match(pattern);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

/** System-issued unique tenant code. Businesses: BIZ-0001. Branches: BIZ-0001-B01. */
export async function allocateTenantCode(
  supabase: { from: (table: string) => any },
  kind: OrganizationType,
  parentCode?: string | null
): Promise<string> {
  if (kind === 'branch') {
    const prefix = (parentCode || 'BRN').trim().toUpperCase();
    const { data } = await supabase.from('tenants').select('tenant_code').ilike('tenant_code', `${prefix}-B%`);
    const codes = (data ?? []).map((row: { tenant_code?: string | null }) =>
      String(row.tenant_code || '').toUpperCase()
    );
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sequence = nextSequence(codes, new RegExp(`^${escaped}-B(\\d+)$`, 'i'));
    return formatBranchCode(prefix, sequence);
  }

  const { data } = await supabase.from('tenants').select('tenant_code').ilike('tenant_code', 'BIZ-%');
  const codes = (data ?? []).map((row: { tenant_code?: string | null }) =>
    String(row.tenant_code || '').toUpperCase()
  );
  const sequence = nextSequence(codes, /^BIZ-(\d+)$/);
  return formatBusinessCode(sequence);
}

export async function slugIsTaken(
  supabase: { from: (table: string) => any },
  slug: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase.from('tenants').select('id').eq('slug', slug);
  if (excludeId) query = query.neq('id', excludeId);
  const { data } = await query.maybeSingle();
  return Boolean(data?.id);
}

export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function normalizeTenantPayload(body: Record<string, unknown>) {
  const name = String(body.name ?? '').trim();
  const slugRaw = String(body.slug ?? '').trim();
  const slug = toSlug(slugRaw || name);
  const organizationType =
    String(body.organization_type ?? 'central').trim() === 'branch' ? 'branch' : 'central';
  const parentTenantId =
    organizationType === 'branch' && body.parent_tenant_id
      ? String(body.parent_tenant_id).trim()
      : null;
  const incomingSettings =
    body.settings && typeof body.settings === 'object' && !Array.isArray(body.settings)
      ? (body.settings as Record<string, unknown>)
      : {};
  const status = normalizeBusinessStatus(
    body.status ??
      incomingSettings.status ??
      (body.is_active === false || body.is_active === 'inactive' ? 'inactive' : body.is_active),
    'pending'
  );

  const city = 'city' in body ? textOrNull(body.city) : textOrNull(incomingSettings.city);
  const cityMeta = city
    ? AFGHANISTAN_CITIES.find((item) => item.name.toLowerCase() === city.toLowerCase())
    : undefined;
  const services = 'services' in body ? parseServices(body.services) : parseServices(incomingSettings.services);
  const workingHours =
    'working_hours' in body || 'working_hours_display' in body
      ? parseWorkingHours(body.working_hours ?? body.working_hours_display)
      : parseWorkingHours(incomingSettings.working_hours);
  const profileSettings = {
    ...('bio' in body ? { bio: textOrNull(body.bio) } : {}),
    ...('tagline' in body ? { tagline: textOrNull(body.tagline) } : {}),
    ...('city' in body ? { city } : {}),
    ...('country' in body ? { country: textOrNull(body.country) } : {}),
    ...('services' in body ? { services } : {}),
    ...('working_hours' in body || 'working_hours_display' in body
      ? { working_hours: workingHours }
      : {}),
  };

  return {
    name,
    slug,
    tenant_code: null,
    organization_type: organizationType as OrganizationType,
    parent_tenant_id: parentTenantId,
    description: body.description ? String(body.description).trim() : null,
    website: body.website ? String(body.website).trim() : null,
    address: body.address ? String(body.address).trim() : null,
    phone: body.phone ? String(body.phone).trim() : null,
    email: body.email ? String(body.email).trim() : null,
    plan: body.plan ? String(body.plan).trim().toLowerCase() : 'standard',
    is_active: status === 'active',
    max_users: body.max_users != null && body.max_users !== '' ? Number(body.max_users) : 100,
    logo_url: body.logo_url ? String(body.logo_url).trim() : null,
    services,
    working_hours: workingHours,
    latitude:
      body.latitude != null && body.latitude !== ''
        ? Number(body.latitude)
        : cityMeta?.lat ?? null,
    longitude:
      body.longitude != null && body.longitude !== ''
        ? Number(body.longitude)
        : cityMeta?.lng ?? null,
    settings: {
      ...incomingSettings,
      status,
      ...profileSettings,
      ...(body.cover_url ? { cover_url: String(body.cover_url).trim() } : {}),
      ...(body.business_type_id
        ? {
            business_type_id: String(body.business_type_id).trim(),
            business_type_name: body.business_type_name
              ? String(body.business_type_name).trim()
              : null,
            business_type_slug: body.business_type_slug
              ? String(body.business_type_slug).trim()
              : null,
          }
        : {}),
    },
  };
}
