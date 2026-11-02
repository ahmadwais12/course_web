'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { Shield } from 'lucide-react';
import type { PermissionRow, RoleRow } from '@/lib/rbac';
import { roleLabel } from '@/lib/rbac';
import { useListQuery } from '@/hooks/useListQuery';
import {
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  MultiSelectField,
  RowActions,
  StatusChip,
} from '@/components/ports';

export default function RolesPage() {
  const [items, setItems] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showAllPerms, setShowAllPerms] = useState(false);
  const [permsRole, setPermsRole] = useState<RoleRow | null>(null);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const permissionOptions = useMemo(
    () => permissions.map((p) => ({ value: p.id, label: p.name })),
    [permissions]
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch('/api/roles'),
        fetch('/api/permissions'),
      ]);
      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();
      if (!rolesRes.ok) throw new Error(rolesData.error || 'Failed to load roles');
      setItems(Array.isArray(rolesData) ? rolesData : []);
      setPermissions(Array.isArray(permsData) ? permsData : []);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load';
      setError(message);
      setItems([]);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const list = useListQuery({
    items: items as (RoleRow & Record<string, unknown>)[],
    searchKeys: ['name', 'slug'],
  });

  const openAdd = () => {
    setEditing(null);
    setName('');
    setSlug('');
    setSelectedPermissionIds([]);
    setError(null);
    setShowDialog(true);
  };

  const openEdit = (role: RoleRow) => {
    setEditing(role);
    setName(role.name);
    setSlug(role.slug || role.name);
    setSelectedPermissionIds((role.permissions ?? []).map((p) => p.id));
    setError(null);
    setShowDialog(true);
  };

  const openAllPermissions = (role: RoleRow) => {
    setPermsRole(role);
    setShowAllPerms(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || selectedPermissionIds.length === 0) {
      const message = 'Role name, slug, and at least one permission are required';
      setError(message);
      toast.error(message);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        permissions: selectedPermissionIds,
      };
      const res = await fetch(editing ? `/api/roles/${editing.id}` : '/api/roles', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setShowDialog(false);
      toast.success(editing ? 'Role updated successfully' : 'Role created successfully');
      await fetchAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (role: RoleRow) => {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      const res = await fetch(`/api/roles/${role.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast.success(`Role "${role.name}" deleted`);
      await fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const submitDisabled =
    submitting || !name.trim() || !slug.trim() || selectedPermissionIds.length === 0;

  return (
    <>
      <ListPageShell
        title="Roles & Permissions"
        description="Manage user roles and their associated permissions"
        primaryAction={{ label: 'Add Role', onClick: openAdd }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search roles…"
        onResetFilters={list.reset}
        loading={loading}
        columns={[
          {
            key: 'name',
            header: 'Role Name',
            render: (role) => {
              const perms = role.permissions ?? [];
              return (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                    <Shield size={14} className="text-primary-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{roleLabel(role.name)}</div>
                    <div className="text-xs text-muted-foreground">
                      {perms.length} permission{perms.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              );
            },
          },
          {
            key: 'slug',
            header: 'Slug',
            render: (role) => (
              <code className="rounded border border-border bg-muted px-2 py-1 text-xs">
                {role.slug || role.name}
              </code>
            ),
          },
          {
            key: 'permissions',
            header: 'Permissions',
            render: (role) => {
              const perms = role.permissions ?? [];
              if (perms.length === 0) {
                return <span className="text-xs text-muted-foreground">No permissions assigned</span>;
              }
              return (
                <div className="flex max-w-xl flex-wrap gap-1.5">
                  {perms.slice(0, 3).map((p) => (
                    <StatusChip key={p.id} label={p.name} tone="blue" />
                  ))}
                  {perms.length > 3 && (
                    <button
                      type="button"
                      onClick={() => openAllPermissions(role)}
                      className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
                    >
                      +{perms.length - 3} more
                    </button>
                  )}
                </div>
              );
            },
          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (role) => (
              <RowActions onEdit={() => openEdit(role)} onDelete={() => handleDelete(role)} />
            ),
          },
        ]}
        rows={list.rows as RoleRow[]}
        rowKey={(role) => role.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No roles yet. Run sql/migrate_profiles_to_users_and_roles.sql first."
      >
        {error && !showDialog && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={showDialog}
        title={editing ? 'Edit Role' : 'Add New Role'}
        onClose={() => setShowDialog(false)}
        maxWidth="2xl"
        footer={
          <FormDialogFooter
            onCancel={() => setShowDialog(false)}
            submitLabel={editing ? 'Update Role' : 'Create Role'}
            submitting={submitting}
            disabled={submitDisabled}
            formId="role-form"
          />
        }
      >
        <form id="role-form" onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Role Name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!editing) {
                setSlug(
                  e.target.value
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '_')
                    .replace(/^_+|_+$/g, '')
                );
              }
            }}
            placeholder="Enter role name (e.g., Branch Manager)"
          />
          <InputField
            label="Slug"
            required
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_'))
            }
            placeholder="e.g. branch_manager, cashier"
          />
          {editing && <InputField label="Role ID" value={editing.id} disabled />}
          <MultiSelectField
            label="Permissions"
            required
            value={selectedPermissionIds}
            onChange={setSelectedPermissionIds}
            options={permissionOptions}
            placeholder="Select permissions for this role"
            filterPlaceholder="Search permissions…"
            clearable
            maxSelectedLabels={5}
            invalid={Boolean(error && selectedPermissionIds.length === 0)}
          />
          {error && showDialog && <ErrorBanner message={error} />}
        </form>
      </FormDialog>

      <FormDialog
        open={showAllPerms && Boolean(permsRole)}
        title={permsRole ? `${roleLabel(permsRole.name)} — All Permissions` : 'Permissions'}
        onClose={() => setShowAllPerms(false)}
        maxWidth="2xl"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(permsRole?.permissions ?? []).map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
            >
              <Shield size={14} className="shrink-0 text-primary" />
              <span className="font-medium">{p.name}</span>
            </div>
          ))}
        </div>
      </FormDialog>
    </>
  );
}
