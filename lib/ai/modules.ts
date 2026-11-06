/**
 * AI permission matrix: which roles / RBAC abilities may query which data module.
 * Role defaults mirror the existing role slugs in `lib/roles.ts` + `users.role`;
 * ability grants reuse the Spatie-style permissions from `lib/rbac.ts`.
 */

export const AI_MODULES = [
  'platform_support',
  'academic',
  'admissions',
  'finance',
  'payroll',
  'hr',
  'inventory',
  'reports',
] as const;

export type AIModule = (typeof AI_MODULES)[number];

export const BUSINESS_MODULES: readonly AIModule[] = AI_MODULES.filter((m) => m !== 'platform_support');

export const AI_MODULE_LABELS: Record<AIModule, string> = {
  platform_support: 'Platform support',
  academic: 'Academic',
  admissions: 'Admissions',
  finance: 'Finance',
  payroll: 'Payroll',
  hr: 'HR',
  inventory: 'Inventory',
  reports: 'Reports & analytics',
};

/** Platform owners — may operate without a tenant (platform-wide scope). */
export const PLATFORM_ROLES = ['super_admin', 'ceo'] as const;

export const NON_STAFF_ROLES = ['student', 'guardian', 'parent'] as const;

/** Roles that may manage organization-level AI settings for their own organization. */
export const ORG_ADMIN_ROLES = ['super_admin', 'ceo', 'admin'] as const;

export const STAFF_ROLES = [
  'super_admin',
  'ceo',
  'admin',
  'branch_manager',
  'teacher',
  'staff',
  'academic_support',
  'accountant',
  'cashier',
  'librarian',
  'receptionist',
  'hr_manager',
  'inventory_manager',
  'it_support',
  'maintenance',
  'event_manager',
  'complaint_manager',
] as const;

const ROLE_MODULES: Record<AIModule, readonly string[]> = {
  platform_support: STAFF_ROLES,
  academic: ['super_admin', 'ceo', 'admin', 'branch_manager', 'academic_support', 'teacher', 'receptionist'],
  admissions: ['super_admin', 'ceo', 'admin', 'branch_manager', 'academic_support', 'receptionist'],
  finance: ['super_admin', 'ceo', 'admin', 'branch_manager', 'accountant', 'cashier'],
  payroll: ['super_admin', 'ceo', 'admin', 'hr_manager'],
  hr: ['super_admin', 'ceo', 'admin', 'branch_manager', 'hr_manager'],
  // The inventory store (`lib/inventory-store.ts`) is not tenant-scoped yet, so only
  // platform-scope users may query it (enforced again in resolveAllowedModules).
  inventory: ['super_admin', 'ceo'],
  reports: ['super_admin', 'ceo', 'admin', 'branch_manager'],
};

/** Explicit RBAC grants (role_has_permissions) that unlock a module for custom roles. */
const ABILITY_MODULES: Partial<Record<AIModule, readonly string[]>> = {
  academic: ['Students', 'Attendance', 'Exams', 'Courses'],
  admissions: ['Add Students'],
  finance: ['Payments'],
  payroll: ['Salaries'],
  hr: ['Teachers'],
  reports: ['Reports'],
};

export function isPlatformRole(role: string | null | undefined) {
  return Boolean(role && (PLATFORM_ROLES as readonly string[]).includes(role));
}

export function isNonStaffRole(role: string | null | undefined) {
  return !role || (NON_STAFF_ROLES as readonly string[]).includes(role);
}

export function isOrgAdminRole(role: string | null | undefined) {
  return Boolean(role && (ORG_ADMIN_ROLES as readonly string[]).includes(role));
}

export function isAIModule(value: unknown): value is AIModule {
  return typeof value === 'string' && (AI_MODULES as readonly string[]).includes(value);
}

/** Whether a role may use the assistant at all, given the organization's allowed-roles list. */
export function canRoleUseAI(role: string | null | undefined, allowedRoles?: readonly string[] | null) {
  if (isNonStaffRole(role)) return false;
  if (isPlatformRole(role)) return true;
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(role as string);
}

export type ModuleAccessInput = {
  role: string | null | undefined;
  abilities: readonly string[];
  /** Organization allow-list from ai_tenant_settings (null = every module). */
  tenantAllowedModules?: readonly string[] | null;
  isPlatformScope: boolean;
  capabilities?: { platform_support?: boolean; business_data?: boolean } | null;
};

/** Modules this user may query — role default OR explicit ability, then org + capability filters. */
export function resolveAllowedModules(input: ModuleAccessInput): AIModule[] {
  const { role, abilities, tenantAllowedModules, isPlatformScope, capabilities } = input;
  if (isNonStaffRole(role)) return [];

  return AI_MODULES.filter((module) => {
    if (module === 'inventory' && !isPlatformScope) return false;
    if (module === 'platform_support' && capabilities?.platform_support === false) return false;
    if (module !== 'platform_support' && capabilities?.business_data === false) return false;
    if (tenantAllowedModules && !tenantAllowedModules.includes(module)) return false;

    const byRole = ROLE_MODULES[module].includes(role as string);
    const byAbility = (ABILITY_MODULES[module] ?? []).some((a) => abilities.includes(a));
    return byRole || byAbility;
  });
}
