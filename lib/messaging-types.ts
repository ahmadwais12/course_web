import { toSlug } from '@/lib/business';

export const MESSAGING_TYPE_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'draft', label: 'Draft' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'archived', label: 'Archived' },
] as const;

export type MessagingTypeStatus = (typeof MESSAGING_TYPE_STATUSES)[number]['value'];

export type MessagingTypeRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: MessagingTypeStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

export const SETTINGS_KEY = 'messaging_types';

export function conversationTypeSlug(type?: string | null) {
  const value = (type || 'direct').trim().toLowerCase();
  if (value === 'class_group') return 'group';
  return value || 'direct';
}

export function isDirectMessagingType(slug?: string | null) {
  return conversationTypeSlug(slug) === 'direct';
}

export function messagingTypeLabel(
  types: Pick<MessagingTypeRow, 'slug' | 'name'>[],
  slug?: string | null
) {
  const key = conversationTypeSlug(slug);
  return types.find((item) => item.slug === key)?.name || key;
}

export function isMessagingTypeStatus(value: string): value is MessagingTypeStatus {
  return MESSAGING_TYPE_STATUSES.some((s) => s.value === value);
}

export function normalizeStatus(
  value: unknown,
  fallback: MessagingTypeStatus = 'active'
): MessagingTypeStatus {
  const raw = String(value ?? '')
    .toLowerCase()
    .trim();
  if (isMessagingTypeStatus(raw)) return raw;
  if (value === true || raw === 'true') return 'active';
  if (value === false || raw === 'false') return 'inactive';
  return fallback;
}

export function hydrateMessagingType(
  row: Partial<MessagingTypeRow> & { id?: string; name?: string; is_active?: boolean | null }
): MessagingTypeRow {
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

export const DEFAULT_MESSAGING_TYPES: Omit<MessagingTypeRow, 'created_at' | 'updated_at'>[] = [
  {
    id: 'direct',
    name: 'Direct',
    slug: 'direct',
    description: 'One-to-one private conversation',
    status: 'active',
    is_active: true,
  },
  {
    id: 'group',
    name: 'Group',
    slug: 'group',
    description: 'Multi-person group chat',
    status: 'active',
    is_active: true,
  },
  {
    id: 'channel',
    name: 'Channel',
    slug: 'channel',
    description: 'Broadcast channel for a team or department',
    status: 'active',
    is_active: true,
  },
  {
    id: 'announcement',
    name: 'Announcement',
    slug: 'announcement',
    description: 'One-way announcements to many people',
    status: 'active',
    is_active: true,
  },
  {
    id: 'support',
    name: 'Support',
    slug: 'support',
    description: 'Support or helpdesk conversation',
    status: 'active',
    is_active: true,
  },
];

export function normalizeMessagingType(
  body: Record<string, unknown>,
  existing?: MessagingTypeRow
): MessagingTypeRow {
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

export function parseStoredTypes(value: unknown): MessagingTypeRow[] {
  let parsed: unknown = value;
  if (typeof value === 'string' && value.trim()) {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((row) => hydrateMessagingType(row as Partial<MessagingTypeRow>));
}
