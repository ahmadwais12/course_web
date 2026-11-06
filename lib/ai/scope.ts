/** Pure tenant-scope rules (kept separate from Supabase access so they can be unit-tested). */

export type TenantRow = {
  id: string;
  name: string | null;
  organization_type: string | null;
  parent_tenant_id: string | null;
  is_active: boolean | null;
  plan: string | null;
  settings?: Record<string, unknown> | null;
};

export type ResolvedScope = {
  organization: TenantRow;
  tenantScope: string[];
  tenantNames: Record<string, string>;
  scopeLabel: string;
  subscriptionActive: boolean;
  currency: string;
};

/**
 * Branch staff see only their branch. Central-organization staff see the organization
 * plus its branches (there is no per-user branch assignment in the schema yet).
 */
export function buildTenantScope(
  tenant: TenantRow,
  parent: TenantRow | null,
  children: TenantRow[]
): ResolvedScope {
  const isBranch = Boolean(tenant.parent_tenant_id) && tenant.organization_type === 'branch';
  const organization = isBranch && parent ? parent : tenant;
  const scopeRows = isBranch ? [tenant] : [tenant, ...children.filter((c) => c.parent_tenant_id === tenant.id)];
  const tenantNames: Record<string, string> = {};
  for (const row of scopeRows) tenantNames[row.id] = row.name || 'Unnamed branch';
  const settingsCurrency = (s: TenantRow | null) =>
    s?.settings && typeof s.settings.currency === 'string' ? (s.settings.currency as string) : null;
  return {
    organization,
    tenantScope: scopeRows.map((r) => r.id),
    tenantNames,
    scopeLabel: isBranch
      ? `${tenant.name || 'Branch'} (branch of ${organization.name || 'organization'})`
      : scopeRows.length > 1
        ? `${tenant.name || 'Organization'} and ${scopeRows.length - 1} branch(es)`
        : tenant.name || 'Organization',
    subscriptionActive: tenant.is_active !== false && organization.is_active !== false,
    currency: settingsCurrency(tenant) || settingsCurrency(organization) || 'AFN',
  };
}
