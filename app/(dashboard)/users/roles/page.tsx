'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import MultiSelect from '@/components/ui/MultiSelect';
import { toast } from '@/components/ui/Toast';
import { Pencil, Plus, Shield, Trash2, X } from 'lucide-react';
import type { PermissionRow, RoleRow } from '@/lib/rbac';
import { roleLabel } from '@/lib/rbac';

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

  const dialogTitle = useMemo(
    () => (editing ? 'Edit Role' : 'Add New Role'),
    [editing]
  );

  const submitDisabled =
    submitting || !name.trim() || !slug.trim() || selectedPermissionIds.length === 0;

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Roles & Permissions</h1>
          <p className="text-muted-foreground">
            Manage user roles and their associated permissions
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Roles</h2>
              <p className="text-sm text-muted-foreground">Total: {items.length} roles</p>
            </div>
            <button
              type="button"
              onClick={openAdd}
              className="emis-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium"
            >
              <Plus size={16} />
              Add Role
            </button>
          </div>

          {loading ? (
            <div className="p-10 text-center text-muted-foreground">Loading roles...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-3 font-bold">Role Name</th>
                    <th className="px-6 py-3 font-bold">Slug</th>
                    <th className="px-6 py-3 font-bold">Permissions</th>
                    <th className="px-6 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((role) => {
                    const perms = role.permissions ?? [];
                    return (
                      <tr key={role.id} className="hover:bg-muted/40 align-top">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                              <Shield size={14} className="text-primary-foreground" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {roleLabel(role.name)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {perms.length} permission{perms.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-xs bg-muted px-2 py-1 rounded border border-border">
                            {role.slug || role.name}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-xl">
                            {perms.slice(0, 3).map((p) => (
                              <span
                                key={p.id}
                                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50"
                              >
                                {p.name}
                              </span>
                            ))}
                            {perms.length > 3 && (
                              <button
                                type="button"
                                onClick={() => openAllPermissions(role)}
                                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                              >
                                +{perms.length - 3} more
                              </button>
                            )}
                            {perms.length === 0 && (
                              <span className="text-xs text-muted-foreground">No permissions assigned</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(role)}
                              className="p-2 rounded-lg border border-border hover:bg-muted"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(role)}
                              className="p-2 rounded-lg border border-destructive/30 hover:bg-destructive/10 text-destructive"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                        No roles yet. Run <code className="text-xs bg-muted px-1 rounded">sql/migrate_profiles_to_users_and_roles.sql</code> first.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="emis-dialog bg-popover text-popover-foreground w-full max-w-2xl rounded-xl border border-border shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-xl font-semibold">{dialogTitle}</h3>
              <button type="button" onClick={() => setShowDialog(false)} className="p-2 rounded-full hover:bg-muted text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4">
              <form id="role-form" onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Role Name <span className="text-destructive">*</span>
                  </label>
                  <input
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
                    required
                    placeholder="Enter role name (e.g., Branch Manager)"
                    className="w-full px-3 py-2.5 rounded-lg bg-card border border-border outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Slug <span className="text-destructive">*</span>
                  </label>
                  <input
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value
                          .trim()
                          .toLowerCase()
                          .replace(/[^a-z0-9_]+/g, '_')
                      )
                    }
                    required
                    placeholder="e.g. branch_manager, cashier"
                    className="w-full px-3 py-2.5 rounded-lg bg-card border border-border outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm font-mono"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Stored on <code className="bg-muted px-1 rounded">users.role</code> ? must match the schema CHECK values.
                  </p>
                </div>

                {editing && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Role ID</label>
                    <input
                      value={editing.id}
                      disabled
                      className="w-full px-3 py-2.5 rounded-lg bg-muted/50 border border-border text-muted-foreground cursor-not-allowed text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Permissions <span className="text-destructive">*</span>
                  </label>
                  <MultiSelect
                    value={selectedPermissionIds}
                    onChange={setSelectedPermissionIds}
                    options={permissionOptions}
                    placeholder="Select permissions for this role"
                    filter
                    clearable
                    maxSelectedLabels={5}
                    invalid={Boolean(error && selectedPermissionIds.length === 0)}
                  />
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}
              </form>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-muted/40">
              <button type="button" onClick={() => setShowDialog(false)} className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium">
                Cancel
              </button>
              <button
                type="submit"
                form="role-form"
                disabled={submitDisabled}
                className="emis-btn-primary min-w-[140px] rounded-lg px-4 py-2 font-medium disabled:opacity-50"
              >
                {submitting ? (editing ? 'Updating...' : 'Creating...') : editing ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAllPerms && permsRole && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="emis-dialog bg-popover text-popover-foreground w-full max-w-2xl rounded-xl border border-border shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-xl font-semibold">
                {roleLabel(permsRole.name)} — All Permissions
              </h3>
              <button type="button" onClick={() => setShowAllPerms(false)} className="p-2 rounded-full hover:bg-muted text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(permsRole.permissions ?? []).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/40 text-sm"
                  >
                    <Shield size={14} className="text-primary shrink-0" />
                    <span className="font-medium">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
