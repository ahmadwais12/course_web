import { toSlug } from '@/lib/business';

export const BUSINESS_PLAN_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'draft', label: 'Draft' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'archived', label: 'Archived' },
] as const;

export const BUSINESS_PLAN_BILLING_INTERVALS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'lifetime', label: 'Lifetime' },
  { value: 'custom', label: 'Custom' },
] as const;

export type BusinessPlanStatus = (typeof BUSINESS_PLAN_STATUSES)[number]['value'];
export type BusinessPlanBillingInterval =
  (typeof BUSINESS_PLAN_BILLING_INTERVALS)[number]['value'];

export type BusinessPlanRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: BusinessPlanStatus;
  is_active: boolean;
  price: number;
  currency: string;
  billing_interval: BusinessPlanBillingInterval;
  duration_months: number | null;
  trial_days: number;
  max_users: number | null;
  max_storage_mb: number | null;
  max_branches: number | null;
  features: string[];
  sort_order: number;
  created_at: string;
  updated_at: string | null;
};

export const SETTINGS_KEY = 'business_plans';

export function isBusinessPlanStatus(value: string): value is BusinessPlanStatus {
  return BUSINESS_PLAN_STATUSES.some((item) => item.value === value);
}

export function isBusinessPlanBillingInterval(
  value: string
): value is BusinessPlanBillingInterval {
  return BUSINESS_PLAN_BILLING_INTERVALS.some((item) => item.value === value);
}

export function normalizePlanStatus(
  value: unknown,
  fallback: BusinessPlanStatus = 'active'
): BusinessPlanStatus {
  const raw = String(value ?? '')
    .toLowerCase()
    .trim();
  if (isBusinessPlanStatus(raw)) return raw;
  if (value === true || raw === 'true') return 'active';
  if (value === false || raw === 'false') return 'inactive';
  return fallback;
}

export function normalizeBillingInterval(
  value: unknown,
  fallback: BusinessPlanBillingInterval = 'monthly'
): BusinessPlanBillingInterval {
  const raw = String(value ?? '')
    .toLowerCase()
    .trim();
  if (isBusinessPlanBillingInterval(raw)) return raw;
  return fallback;
}

export function parsePlanFeatures(value: unknown): string[] {
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

function numberOrNull(value: unknown, fallback: number | null = null): number | null {
  if (value == null || value === '') return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function numberOrZero(value: unknown, fallback = 0): number {
  const num = numberOrNull(value, fallback);
  return num == null ? fallback : num;
}

export function hydrateBusinessPlan(
  row: Partial<BusinessPlanRow> & { id?: string; name?: string; is_active?: boolean | null }
): BusinessPlanRow {
  const status = normalizePlanStatus(
    row.status,
    row.is_active === false ? 'inactive' : 'active'
  );
  const createdAt = row.created_at || new Date().toISOString();
  return {
    id: String(row.id || crypto.randomUUID()),
    name: String(row.name || '').trim(),
    slug: toSlug(String(row.slug || row.name || '')),
    description: row.description ? String(row.description) : null,
    status,
    is_active: row.is_active == null ? status === 'active' : Boolean(row.is_active),
    price: numberOrZero(row.price, 0),
    currency: String(row.currency || 'AFN').trim().toUpperCase() || 'AFN',
    billing_interval: normalizeBillingInterval(row.billing_interval),
    duration_months: numberOrNull(row.duration_months, null),
    trial_days: numberOrZero(row.trial_days, 0),
    max_users: numberOrNull(row.max_users, null),
    max_storage_mb: numberOrNull(row.max_storage_mb, null),
    max_branches: numberOrNull(row.max_branches, null),
    features: parsePlanFeatures(row.features),
    sort_order: numberOrZero(row.sort_order, 0),
    created_at: createdAt,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

export const DEFAULT_BUSINESS_PLANS: Omit<BusinessPlanRow, 'created_at' | 'updated_at'>[] = [
  {
    id: 'standard',
    name: 'Standard',
    slug: 'standard',
    description: 'Default plan for new businesses',
    status: 'active',
    is_active: true,
    price: 0,
    currency: 'AFN',
    billing_interval: 'monthly',
    duration_months: 1,
    trial_days: 14,
    max_users: 50,
    max_storage_mb: 1024,
    max_branches: 1,
    features: ['Core dashboard', 'Students & courses', 'Email support'],
    sort_order: 1,
  },
  {
    id: 'pro',
    name: 'Pro',
    slug: 'pro',
    description: 'More users and features',
    status: 'active',
    is_active: true,
    price: 2500,
    currency: 'AFN',
    billing_interval: 'monthly',
    duration_months: 1,
    trial_days: 7,
    max_users: 200,
    max_storage_mb: 5120,
    max_branches: 5,
    features: ['Everything in Standard', 'Branches', 'Reports', 'Priority support'],
    sort_order: 2,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'Full platform access',
    status: 'active',
    is_active: true,
    price: 7500,
    currency: 'AFN',
    billing_interval: 'yearly',
    duration_months: 12,
    trial_days: 0,
    max_users: null,
    max_storage_mb: 20480,
    max_branches: null,
    features: ['Everything in Pro', 'Unlimited users', 'Custom branding', 'Dedicated support'],
    sort_order: 3,
  },
];

export function normalizeBusinessPlan(
  body: Record<string, unknown>,
  existing?: BusinessPlanRow
): BusinessPlanRow {
  const name = String(body.name ?? existing?.name ?? '').trim();
  const slug = toSlug(String(body.slug ?? existing?.slug ?? name));
  const status = normalizePlanStatus(
    body.status ?? (body.is_active === false || body.is_active === 'inactive' ? 'inactive' : existing?.status),
    existing?.status ?? 'active'
  );
  const now = new Date().toISOString();
  const features =
    'features' in body ? parsePlanFeatures(body.features) : existing?.features ?? [];

  return {
    id: existing?.id || crypto.randomUUID(),
    name,
    slug,
    description:
      body.description != null ? String(body.description).trim() || null : existing?.description ?? null,
    status,
    is_active:
      body.is_active != null
        ? body.is_active === true || body.is_active === 'true' || body.is_active === 'active'
        : status === 'active',
    price: numberOrZero(body.price ?? existing?.price, 0),
    currency: String(body.currency ?? existing?.currency ?? 'AFN')
      .trim()
      .toUpperCase() || 'AFN',
    billing_interval: normalizeBillingInterval(
      body.billing_interval ?? existing?.billing_interval,
      'monthly'
    ),
    duration_months:
      'duration_months' in body
        ? numberOrNull(body.duration_months, null)
        : existing?.duration_months ?? null,
    trial_days: numberOrZero(body.trial_days ?? existing?.trial_days, 0),
    max_users:
      'max_users' in body ? numberOrNull(body.max_users, null) : existing?.max_users ?? null,
    max_storage_mb:
      'max_storage_mb' in body
        ? numberOrNull(body.max_storage_mb, null)
        : existing?.max_storage_mb ?? null,
    max_branches:
      'max_branches' in body
        ? numberOrNull(body.max_branches, null)
        : existing?.max_branches ?? null,
    features,
    sort_order: numberOrZero(body.sort_order ?? existing?.sort_order, 0),
    created_at: existing?.created_at || now,
    updated_at: now,
  };
}

export function planTablePayload(plan: BusinessPlanRow) {
  return {
    name: plan.name,
    slug: plan.slug,
    description: plan.description,
    status: plan.status,
    is_active: plan.is_active,
    price: plan.price,
    currency: plan.currency,
    billing_interval: plan.billing_interval,
    duration_months: plan.duration_months,
    trial_days: plan.trial_days,
    max_users: plan.max_users,
    max_storage_mb: plan.max_storage_mb,
    max_branches: plan.max_branches,
    features: plan.features,
    sort_order: plan.sort_order,
    updated_at: plan.updated_at,
  };
}

export function parseStoredPlans(value: unknown): BusinessPlanRow[] {
  let parsed: unknown = value;
  if (typeof value === 'string' && value.trim()) {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((row) => hydrateBusinessPlan(row as Partial<BusinessPlanRow>));
}

export function isActiveBusinessPlan(row: BusinessPlanRow): boolean {
  return row.status === 'active' || (row.status == null && row.is_active);
}

export function formatPlanPrice(plan: Pick<BusinessPlanRow, 'price' | 'currency'>): string {
  return `${Number(plan.price || 0).toLocaleString()} ${plan.currency || 'AFN'}`;
}

export function formatPlanDuration(plan: Pick<BusinessPlanRow, 'billing_interval' | 'duration_months'>): string {
  if (plan.billing_interval === 'lifetime') return 'Lifetime';
  if (plan.duration_months != null && plan.duration_months > 0) {
    return `${plan.duration_months} month${plan.duration_months === 1 ? '' : 's'}`;
  }
  return plan.billing_interval || '—';
}

export function formatPlanLimit(value: number | null | undefined, unit = ''): string {
  if (value == null) return 'Unlimited';
  return unit ? `${value.toLocaleString()} ${unit}` : value.toLocaleString();
}
