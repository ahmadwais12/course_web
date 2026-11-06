import { toSlug } from '@/lib/business';

export const STUDENT_LEVEL_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'draft', label: 'Draft' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
] as const;

export type StudentLevelStatus = (typeof STUDENT_LEVEL_STATUSES)[number]['value'];

export type StudentLevelRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  status: StudentLevelStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

export const SETTINGS_KEY = 'student_levels';

export function isStudentLevelStatus(value: string): value is StudentLevelStatus {
  return STUDENT_LEVEL_STATUSES.some((s) => s.value === value);
}

export function normalizeStatus(
  value: unknown,
  fallback: StudentLevelStatus = 'active'
): StudentLevelStatus {
  const raw = String(value ?? '')
    .toLowerCase()
    .trim();
  if (isStudentLevelStatus(raw)) return raw;
  if (value === true || raw === 'true') return 'active';
  if (value === false || raw === 'false') return 'inactive';
  return fallback;
}

export function hydrateStudentLevel(
  row: Partial<StudentLevelRow> & { id?: string; name?: string; is_active?: boolean | null }
): StudentLevelRow {
  const status = normalizeStatus(
    row.status,
    row.is_active === false ? 'inactive' : row.is_active === true ? 'active' : 'active'
  );
  const createdAt = row.created_at || new Date().toISOString();
  const sortOrder = Number(row.sort_order);
  return {
    id: String(row.id || crypto.randomUUID()),
    name: String(row.name || '').trim(),
    slug: toSlug(String(row.slug || row.name || '')),
    description: row.description ? String(row.description) : null,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    status,
    is_active: row.is_active == null ? status === 'active' : Boolean(row.is_active),
    created_at: createdAt,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

export const DEFAULT_STUDENT_LEVELS: Omit<StudentLevelRow, 'created_at' | 'updated_at'>[] = [
  {
    id: 'beginner',
    name: 'Beginner',
    slug: 'beginner',
    description: 'Starting level for new learners',
    sort_order: 10,
    status: 'active',
    is_active: true,
  },
  {
    id: 'elementary',
    name: 'Elementary',
    slug: 'elementary',
    description: 'Basic foundation after beginner',
    sort_order: 20,
    status: 'active',
    is_active: true,
  },
  {
    id: 'intermediate',
    name: 'Intermediate',
    slug: 'intermediate',
    description: 'Mid-level progressing students',
    sort_order: 30,
    status: 'active',
    is_active: true,
  },
  {
    id: 'upper-intermediate',
    name: 'Upper Intermediate',
    slug: 'upper-intermediate',
    description: 'Advanced preparation level',
    sort_order: 40,
    status: 'active',
    is_active: true,
  },
  {
    id: 'advanced',
    name: 'Advanced',
    slug: 'advanced',
    description: 'High proficiency level',
    sort_order: 50,
    status: 'active',
    is_active: true,
  },
];

export function normalizeStudentLevel(
  body: Record<string, unknown>,
  existing?: StudentLevelRow
): StudentLevelRow {
  const name = String(body.name ?? existing?.name ?? '').trim();
  const slug = toSlug(String(body.slug ?? existing?.slug ?? name));
  const status = normalizeStatus(
    body.status ??
      (body.is_active === false || body.is_active === 'inactive' ? 'inactive' : existing?.status),
    existing?.status ?? 'active'
  );
  const sortRaw = body.sort_order ?? existing?.sort_order ?? 0;
  const sortOrder = Number(sortRaw);
  const now = new Date().toISOString();
  return {
    id: existing?.id || crypto.randomUUID(),
    name,
    slug,
    description:
      body.description != null
        ? String(body.description).trim() || null
        : existing?.description ?? null,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    status,
    is_active:
      body.is_active != null
        ? body.is_active === true || body.is_active === 'true' || body.is_active === 'active'
        : status === 'active',
    created_at: existing?.created_at || now,
    updated_at: now,
  };
}

export function parseStoredLevels(value: unknown): StudentLevelRow[] {
  let parsed: unknown = value;
  if (typeof value === 'string' && value.trim()) {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((row) => hydrateStudentLevel(row as Partial<StudentLevelRow>));
}
