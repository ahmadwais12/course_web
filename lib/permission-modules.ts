/** Module prefixes from the Al-Hawa permissions page, longest match first. */
export const PERMISSION_MODULES = [
  { value: 'inventory_transactions', label: 'Inventory transactions' },
  { value: 'inventory_settings', label: 'Inventory settings' },
  { value: 'ims_asset_holders', label: 'IMS asset holders' },
  { value: 'asset_holders', label: 'Asset holders' },
  { value: 'assets', label: 'Assets' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'projects', label: 'Projects' },
  { value: 'users', label: 'Users' },
  { value: 'settings', label: 'Settings' },
  { value: 'students', label: 'Students' },
  { value: 'courses', label: 'Courses' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'payments', label: 'Payments' },
  { value: 'reports', label: 'Reports' },
  { value: 'organization', label: 'Organization' },
  { value: 'academic', label: 'Academic' },
  { value: 'admissions', label: 'Admissions' },
  { value: 'finance', label: 'Finance' },
  { value: 'hr', label: 'HR' },
  { value: 'communication', label: 'Communication' },
] as const;

const MODULE_KEYS = [...PERMISSION_MODULES.map((item) => item.value)].sort((a, b) => b.length - a.length);

export function permissionModule(name: string) {
  const value = String(name || '');
  for (const key of MODULE_KEYS) {
    if (value === key || value.startsWith(`${key}.`)) return key;
  }
  return '';
}

export function permissionAbility(name: string, moduleKey = permissionModule(name)) {
  if (!moduleKey) return name;
  const prefix = `${moduleKey}.`;
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

/** Demo rule: lowercase letters, numbers, underscores, and dots, like assets.read */
export function isModulePermissionName(name: string) {
  return /^[a-z0-9_]+(\.[a-z0-9_]+)+$/.test(name);
}
