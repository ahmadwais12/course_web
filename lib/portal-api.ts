import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type PortalRequestUser = {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  tenantId: string | null;
};

export type PortalAuthResult =
  | { ok: true; user: PortalRequestUser; admin: ReturnType<typeof createSupabaseAdminClient> }
  | { ok: false; status: 401 | 403; error: string };

const NON_PORTAL_ROLES = new Set(['guardian', 'parent']);

/**
 * Cookie session + service-role client. Every portal route then scopes its
 * queries by the records linked to this user (profile_id / class ownership).
 */
export async function requirePortalUser(
  allowed: (role: string) => boolean
): Promise<PortalAuthResult> {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return { ok: false, status: 401, error: 'Sign in required' };

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from('users')
    .select('id, role, tenant_id, full_name, email, phone, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  const role = String(
    (profile as { role?: string } | null)?.role ||
      (typeof user.user_metadata?.role === 'string' ? user.user_metadata.role : '') ||
      ''
  );
  if (!role || NON_PORTAL_ROLES.has(role)) {
    return { ok: false, status: 403, error: 'Portal access required' };
  }
  if (!allowed(role)) {
    return { ok: false, status: 403, error: 'This portal is not available for your role' };
  }

  return {
    ok: true,
    admin,
    user: {
      id: user.id,
      email: user.email ?? (profile as { email?: string | null } | null)?.email ?? null,
      name: (profile as { full_name?: string | null } | null)?.full_name ?? null,
      phone: (profile as { phone?: string | null } | null)?.phone ?? null,
      avatarUrl: (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null,
      role,
      tenantId: (profile as { tenant_id?: string | null } | null)?.tenant_id ?? null,
    },
  };
}

/** Runs a Supabase query and falls back to `fallback` when the table/bucket is not migrated. */
export async function safeRows<T>(
  query: PromiseLike<{ data: unknown; error: { message?: string } | null }>,
  fallback: T[] = []
): Promise<T[]> {
  try {
    const { data, error } = await query;
    if (error || !Array.isArray(data)) return fallback;
    return data as T[];
  } catch {
    return fallback;
  }
}

export async function safeRow<T>(
  query: PromiseLike<{ data: unknown; error: { message?: string } | null }>,
  fallback: T | null = null
): Promise<T | null> {
  try {
    const { data, error } = await query;
    if (error || !data || Array.isArray(data)) return fallback;
    return data as T;
  } catch {
    return fallback;
  }
}

export function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function num(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function jsonNumberMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) result[key] = parsed;
  }
  return result;
}

export type AttendanceRow = {
  id: string;
  person_id: string;
  date: string;
  status: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  late_minutes: number | null;
  remarks: string | null;
};

export function attendanceSummary(rows: AttendanceRow[]) {
  let present = 0;
  let absent = 0;
  let late = 0;
  let excused = 0;
  for (const row of rows) {
    if (row.status === 'present') present += 1;
    else if (row.status === 'absent') absent += 1;
    else if (row.status === 'late') late += 1;
    else if (row.status === 'excused') excused += 1;
  }
  const total = present + absent + late + excused;
  return {
    present,
    absent,
    late,
    excused,
    total,
    percentage: total ? Math.round(((present + late) / total) * 100) : 0,
  };
}

export function monthlyAttendance(rows: AttendanceRow[]) {
  const buckets = new Map<
    string,
    { present: number; absent: number; late: number; total: number }
  >();
  for (const row of rows) {
    const key = String(row.date).slice(0, 7);
    if (!key) continue;
    const bucket = buckets.get(key) ?? { present: 0, absent: 0, late: 0, total: 0 };
    if (row.status === 'present') bucket.present += 1;
    else if (row.status === 'absent') bucket.absent += 1;
    else if (row.status === 'late') bucket.late += 1;
    bucket.total += 1;
    buckets.set(key, bucket);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .map(([month, value]) => ({ month, ...value }));
}

export function daysBetween(start: string, end: string | null) {
  const from = Date.parse(start);
  const to = Date.parse(end || start);
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return 0;
  return Math.floor((to - from) / 86_400_000) + 1;
}

type DocumentLike = {
  id: string;
  title: string;
  documentType: string | null;
  url: string;
  issueDate: string | null;
  expiryDate: string | null;
  issuedBy: string | null;
  isVerified: boolean;
};

/** Normalizes the `documents` jsonb columns used on students / teachers / staff. */
export function jsonDocuments(value: unknown): DocumentLike[] {
  if (!Array.isArray(value)) return [];
  const out: DocumentLike[] = [];
  value.forEach((entry, index) => {
    if (typeof entry === 'string') {
      if (!entry.trim()) return;
      out.push({
        id: `json-${index}`,
        title: entry.split('/').pop() || `Document ${index + 1}`,
        documentType: null,
        url: entry,
        issueDate: null,
        expiryDate: null,
        issuedBy: null,
        isVerified: false,
      });
      return;
    }
    if (!entry || typeof entry !== 'object') return;
    const row = entry as Record<string, unknown>;
    const url = str(row.url) || str(row.document_url) || str(row.file_url);
    if (!url) return;
    out.push({
      id: str(row.id) || `json-${index}`,
      title:
        str(row.title) ||
        str(row.name) ||
        str(row.document_type)?.replaceAll('_', ' ') ||
        `Document ${index + 1}`,
      documentType: str(row.document_type) || str(row.type),
      url,
      issueDate: str(row.issue_date),
      expiryDate: str(row.expiry_date),
      issuedBy: str(row.issued_by),
      isVerified: Boolean(row.is_verified),
    });
  });
  return out;
}
