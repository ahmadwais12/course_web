/** KMS-style RBAC helpers for DreamFlow EMIS */

export const GUARD_NAME = 'web';

/** Page/module + action permissions (Title Case, like KMS) */
export const EMIS_PERMISSIONS = [
  'Team',
  'Dashboard',
  'Students',
  'Teachers',
  'Courses',
  'Attendance',
  'Exams',
  'Payments',
  'Salaries',
  'Reports',
  'Books',
  'Feedback',
  'Settings',
  'User Management',
  'Roles',
  'Permissions',
  'Create Users',
  'Add Students',
  'Edit Students',
  'Delete Students',
  'Add Courses',
  'Edit Courses',
  'Delete Courses',
  'Add Payments',
  'Edit Payments',
  'Delete Payments',
] as const;

export type EmisPermission = (typeof EMIS_PERMISSIONS)[number];

export type RoleRow = {
  id: string;
  name: string;
  /** Machine id stored on users.role — matches schema CHECK / SYSTEM_ROLES ids */
  slug: string;
  guard_name: string;
  created_at?: string;
  permissions?: PermissionRow[];
};

export type PermissionRow = {
  id: string;
  name: string;
  guard_name: string;
  created_at?: string;
};

export type ProfileUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  is_active: boolean | null;
  tenant_id: string | null;
  created_at?: string;
  roles?: { id: string; name: string }[];
};

export function roleLabel(name: string) {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function can(abilities: string[], permission: string) {
  return abilities.includes(permission);
}

export function canAny(abilities: string[], permissions: string[]) {
  return permissions.some((p) => abilities.includes(p));
}

export function canAll(abilities: string[], permissions: string[]) {
  return permissions.every((p) => abilities.includes(p));
}
