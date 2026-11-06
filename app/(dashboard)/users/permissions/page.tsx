'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import type { PermissionRow, RoleRow } from '@/lib/rbac';
import {
  PERMISSION_MODULES,
  isModulePermissionName,
  permissionAbility,
  permissionModule,
} from '@/lib/permission-modules';
import { useListQuery } from '@/hooks/useListQuery';
import { Eye } from 'lucide-react';
import {
  ConfirmDialog,
  DataTable,
  Dropdown,
  ErrorBanner,
  FormDialog,
  InputField,
  MultiSelectField,
  PageHeader,
  PortButton,
  RowActions,
  SectionPanel,
} from '@/components/ports';

type ListedPermission = PermissionRow & { module: string; ability: string };

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionName, setPermissionName] = useState('');
  const [roleName, setRoleName] = useState('');
  const [savingPermission, setSavingPermission] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [moduleKey, setModuleKey] = useState('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);
  const [viewRole, setViewRole] = useState<RoleRow | null>(null);
  const [viewModule, setViewModule] = useState('');
  const [pendingPermission, setPendingPermission] = useState<ListedPermission | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [permRes, roleRes] = await Promise.all([fetch('/api/permissions'), fetch('/api/roles')]);
      const permData = await permRes.json();
      const roleData = await roleRes.json();
      if (!permRes.ok) throw new Error(permData.error || 'Failed to load permissions');
      if (!roleRes.ok) throw new Error(roleData.error || 'Failed to load roles');
      setPermissions(Array.isArray(permData) ? permData : []);
      setRoles(Array.isArray(roleData) ? roleData : []);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const listed = useMemo<ListedPermission[]>(
    () =>
      permissions.map((item) => ({
        ...item,
        module: permissionModule(item.name) || 'Other',
        ability: permissionAbility(item.name),
      })),
    [permissions]
  );

  const list = useListQuery({
    items: listed as (ListedPermission & Record<string, unknown>)[],
    searchKeys: ['name', 'module', 'ability'],
  });

  const moduleOptions = PERMISSION_MODULES.map((item) => ({ value: item.value, label: item.label }));

  const abilityOptions = useMemo(() => {
    if (!moduleKey) return [];
    return listed
      .filter((item) => item.module === moduleKey)
      .map((item) => ({ value: item.id, label: item.ability }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [listed, moduleKey]);

  useEffect(() => {
    if (!moduleKey || selectedRoleIds.length !== 1) {
      setSelectedPermissionIds([]);
      return;
    }
    const role = roles.find((item) => item.id === selectedRoleIds[0]);
    const ids = (role?.permissions ?? [])
      .filter((item) => permissionModule(item.name) === moduleKey)
      .map((item) => item.id);
    setSelectedPermissionIds(ids);
  }, [moduleKey, selectedRoleIds, roles]);

  const addPermission = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = permissionName.trim();
    if (!isModulePermissionName(name)) {
      toast.error('Use lowercase letters, numbers, underscores, and dots, for example assets.read');
      return;
    }
    setSavingPermission(true);
    try {
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setPermissionName('');
      toast.success('Permission created');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingPermission(false);
    }
  };

  const removePermission = async (item: ListedPermission) => {
    const res = await fetch(`/api/permissions/${item.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || 'Delete failed');
      return;
    }
    toast.success('Permission deleted');
    await load();
  };

  const addRole = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = roleName.trim();
    if (!name) return;
    setSavingRole(true);
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, permissions: [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setRoleName('');
      toast.success('Role created');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingRole(false);
    }
  };

  const saveAssignment = async () => {
    if (!moduleKey || selectedRoleIds.length === 0) return;
    setSavingAssign(true);
    try {
      const chosen = new Set(selectedPermissionIds);
      const modulePermissionIds = new Set(listed.filter((item) => item.module === moduleKey).map((item) => item.id));
      await Promise.all(
        selectedRoleIds.map(async (roleId) => {
          const role = roles.find((item) => item.id === roleId);
          if (!role) return;
          const kept = (role.permissions ?? []).map((item) => item.id).filter((id) => !modulePermissionIds.has(id));
          const next = [...kept, ...[...chosen].filter((id) => modulePermissionIds.has(id))];
          const res = await fetch(`/api/roles/${role.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: role.name, slug: role.slug, permissions: next }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `Could not update ${role.name}`);
        })
      );
      toast.success(
        selectedRoleIds.length === 1 ? 'Permissions saved for 1 role' : `Permissions saved for ${selectedRoleIds.length} roles`
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingAssign(false);
    }
  };

  const viewGroups = useMemo(() => {
    const rows = viewRole?.permissions ?? [];
    const groups = new Map<string, PermissionRow[]>();
    for (const item of rows) {
      const key = permissionModule(item.name) || 'other';
      const bucket = groups.get(key) ?? [];
      bucket.push(item);
      groups.set(key, bucket);
    }
    return [...groups.entries()]
      .filter(([key]) => !viewModule || key === viewModule)
      .map(([key, items]) => ({
        key,
        title: PERMISSION_MODULES.find((item) => item.value === key)?.label || 'Other',
        items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [viewRole, viewModule]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Permissions"
        description="Manage permission names and assign them to roles one module at a time."
      />
      {error && <ErrorBanner message={error} />}

      <SectionPanel
        title="Permission names"
        description="Names use lowercase letters, numbers, underscores, and dots, for example assets.read."
      >
        <form className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={addPermission}>
          <div className="min-w-0 flex-1">
            <InputField
              label="New permission"
              value={permissionName}
              onChange={(event) => setPermissionName(event.target.value)}
              placeholder="assets.read"
            />
          </div>
          <PortButton type="submit" variant="primary" disabled={savingPermission}>
            {savingPermission ? 'Saving…' : 'Add permission'}
          </PortButton>
        </form>
        <DataTable
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'module', header: 'Module' },
            { key: 'ability', header: 'Ability' },
            {
              key: 'actions',
              header: 'Actions',
              align: 'right',
              render: (row) => (
                <div className="flex justify-end">
                  <RowActions onDelete={() => setPendingPermission(row as ListedPermission)} />
                </div>
              ),
            },
          ]}
          rows={list.rows}
          rowKey={(row) => String(row.id)}
          loading={loading}
          emptyMessage="No permissions yet."
          page={list.page}
          perPage={list.perPage}
          total={list.total}
          onPageChange={list.setPage}
          onPerPageChange={list.setPerPage}
        />
      </SectionPanel>

      <SectionPanel
        title="Roles"
        description="Create roles, then open a role to see every permission it already has."
      >
        <form className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={addRole}>
          <div className="min-w-0 flex-1">
            <InputField
              label="New role name"
              value={roleName}
              onChange={(event) => setRoleName(event.target.value)}
              placeholder="e.g. inventory-manager"
            />
          </div>
          <PortButton type="submit" variant="primary" disabled={savingRole}>
            {savingRole ? 'Saving…' : 'Add role'}
          </PortButton>
        </form>
        <DataTable
          columns={[
            { key: 'no', header: 'No.', render: (_row, index) => index + 1 },
            { key: 'name', header: 'Role name' },
            {
              key: 'actions',
              header: 'Actions',
              align: 'right',
              render: (row) => (
                <div className="flex justify-end">
                  <RowActions
                    items={[
                      {
                        key: 'view',
                        label: 'View role permissions',
                        icon: <Eye size={16} />,
                        onClick: () => {
                          setViewRole(row as RoleRow);
                          setViewModule('');
                        },
                      },
                    ]}
                  />
                </div>
              ),
            },
          ]}
          rows={roles}
          rowKey={(row) => row.id}
          loading={loading}
          emptyMessage="No roles yet."
        />
      </SectionPanel>

      <SectionPanel
        title="Assign by module"
        description="Pick one or more roles, then a module, then only the abilities for that module. Permissions on other modules stay as they are. With one role selected, its current abilities for that module are already checked."
      >
        <div className="grid gap-3 lg:grid-cols-3">
          <MultiSelectField
            label="Roles"
            value={selectedRoleIds}
            onChange={setSelectedRoleIds}
            options={roles.map((role) => ({ value: role.id, label: role.name }))}
            placeholder="Select roles"
          />
          <Dropdown
            label="Module"
            value={moduleKey}
            onChange={setModuleKey}
            options={moduleOptions}
            placeholder="Choose module"
            clearable
          />
          <MultiSelectField
            label="Permissions (ability only)"
            value={selectedPermissionIds}
            onChange={setSelectedPermissionIds}
            options={abilityOptions}
            placeholder="Choose permissions"
            disabled={!moduleKey}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <PortButton
            type="button"
            variant="primary"
            disabled={savingAssign || !moduleKey || selectedRoleIds.length === 0}
            onClick={saveAssignment}
          >
            {savingAssign ? 'Saving…' : 'Save permissions for selected roles'}
          </PortButton>
        </div>
      </SectionPanel>

      <FormDialog
        open={Boolean(viewRole)}
        title={viewRole ? `Permissions · ${viewRole.name}` : 'Permissions'}
        onClose={() => setViewRole(null)}
        maxWidth="xl"
      >
        <Dropdown
          label="Filter by module"
          value={viewModule}
          onChange={setViewModule}
          options={[{ value: '', label: 'All modules' }, ...moduleOptions, { value: 'other', label: 'Other' }]}
          placeholder="All modules"
        />
        <div className="mt-4 space-y-4">
          {viewGroups.length === 0 && <p className="text-sm text-muted-foreground">This role has no permissions in that module.</p>}
          {viewGroups.map((group) => (
            <section key={group.key}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</h3>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {group.items.map((item) => (
                  <li key={item.id} className="px-3 py-2">
                    <div className="text-sm font-semibold">{permissionAbility(item.name) || item.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{item.name}</div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </FormDialog>
      <ConfirmDialog
        open={Boolean(pendingPermission)}
        title="Delete permission"
        message={pendingPermission ? `Delete permission ${pendingPermission.name}?` : ''}
        onClose={() => setPendingPermission(null)}
        onConfirm={async () => {
          if (!pendingPermission) return;
          const item = pendingPermission;
          setPendingPermission(null);
          await removePermission(item);
        }}
      />
    </div>
  );
}
