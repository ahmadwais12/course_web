'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ListPageShell,
  StatusChip,
  InputField,
  Dropdown,
  PortButton,
  FormDialog,
  FormDialogFooter,
  PasswordField,
  ErrorBanner,
  RowActions,
} from '@/components/ports';
import { Eye, KeyRound, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RoleRow } from '@/lib/rbac';
import { roleLabel } from '@/lib/rbac';
import { useListQuery } from '@/hooks/useListQuery';
import { toast } from '@/components/ui/Toast';

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  role_name?: string | null;
  status?: string;
  is_active: boolean | null;
  tenant_id?: string | null;
  roles?: { id: string; name: string }[];
  [key: string]: unknown;
};

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
}

/** Admin set-password (KMS): only new password, min 6 */
function validateAdminNewPassword(password: string): string | null {
  if (!password.trim()) return 'New password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return null;
}

export default function UserManagementPage() {
  const supabase = useMemo(() => createClient(), []);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isCreate, setIsCreate] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [statusFilter, setStatusFilter] = useState('');

  const selectedRoleName = roles.find((r) => r.id === roleId)?.name;
  const requiresTenant = selectedRoleName !== 'super_admin' && selectedRoleName !== 'ceo';

  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: r.id, label: roleLabel(r.name) })),
    [roles]
  );
  const tenantOptions = useMemo(
    () => tenants.map((t) => ({ value: t.id, label: t.name })),
    [tenants]
  );
  const statusOptions = useMemo(
    () => [
      { value: 'active', label: 'active' },
      { value: 'inactive', label: 'inactive' },
    ],
    []
  );

  const list = useListQuery({
    items: users,
    searchKeys: ['full_name', 'email', 'phone', 'role_name', 'role'],
    filterKey: statusFilter,
    filterFn: (u) => {
      if (!statusFilter) return true;
      const active = !!u.is_active;
      return statusFilter === 'active' ? active : !active;
    },
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, tenantsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/roles'),
        supabase.from('tenants').select('id, name').order('name'),
      ]);
      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();
      if (!usersRes.ok) throw new Error(usersData.error || 'Failed to load users');
      setUsers(Array.isArray(usersData) ? usersData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setTenants((tenantsRes.data as { id: string; name: string }[]) ?? []);
      setRoleId((prev) => {
        if (prev) return prev;
        if (!Array.isArray(rolesData) || !rolesData[0]) return prev;
        return rolesData.find((r: RoleRow) => r.name === 'admin')?.id || rolesData[0].id;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load';
      setError(message);
      setUsers([]);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setPasswordConfirm('');
    setNewPassword('');
    setTenantId('');
    setStatus('active');
    setError(null);
    setPasswordError(null);
    setPasswordSuccess(null);
  };

  const openCreate = () => {
    resetForm();
    setIsCreate(true);
    setSelectedUser(null);
    setShowModal(true);
  };

  const openEdit = (user: UserRow) => {
    resetForm();
    setIsCreate(false);
    setSelectedUser(user);
    setFullName(user.full_name || '');
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setTenantId(user.tenant_id || '');
    setStatus(user.is_active ? 'active' : 'inactive');
    const linked = user.roles?.[0]?.id;
    const byName = roles.find((r) => r.name === (user.role_name || user.role))?.id;
    setRoleId(linked || byName || '');
    setShowModal(true);
  };

  const openView = (user: UserRow) => {
    setSelectedUser(user);
    setShowView(true);
  };

  const openChangePassword = (user: UserRow) => {
    setSelectedUser(user);
    setNewPassword('');
    setPasswordError(null);
    setPasswordSuccess(null);
    setShowPasswordModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!roleId) {
      setError('Please select a role');
      toast.error('Please select a role');
      return;
    }
    if (requiresTenant && !tenantId) {
      setError('Please select a tenant for this role');
      toast.error('Please select a tenant for this role');
      return;
    }

    if (isCreate) {
      const passwordErrorMsg = validatePassword(password);
      if (passwordErrorMsg) {
        setError(passwordErrorMsg);
        toast.error(passwordErrorMsg);
        return;
      }
      if (password !== passwordConfirm) {
        setError('Passwords do not match');
        toast.error('Passwords do not match');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isCreate) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              role: selectedRoleName,
            },
          },
        });
        if (authError) throw authError;
        if (!authData.user) throw new Error('No user returned from signUp');

        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uuid: authData.user.id,
            email: email.trim(),
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: roleId,
            tenant_id: requiresTenant ? tenantId : null,
            status,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create app user');
      } else if (selectedUser) {
        const res = await fetch(`/api/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: roleId,
            tenant_id: requiresTenant ? tenantId : null,
            status,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update user');
      }

      setShowModal(false);
      toast.success(isCreate ? 'User created successfully' : 'User updated successfully');
      await fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    if (!selectedUser) return;

    const errMsg = validateAdminNewPassword(newPassword);
    if (errMsg) {
      setPasswordError(errMsg);
      toast.error(errMsg);
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuid: selectedUser.id,
          password: newPassword,
          password_confirmation: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password update failed');
      setNewPassword('');
      setPasswordSuccess('Password updated successfully. The user can sign in with the new password now.');
      toast.success('Password updated successfully');
      setTimeout(() => setShowPasswordModal(false), 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password update failed';
      setPasswordError(message);
      toast.error(message);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <>
      <ListPageShell
        title="User Management"
        description="Manage system users, their roles, and permissions"
        primaryAction={{ label: 'Add User', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search name, email, phone…"
        onResetFilters={() => {
          list.reset();
          setStatusFilter('');
        }}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: statusFilter,
            options: statusOptions,
            onChange: setStatusFilter,
          },
        ]}
        loading={loading}
        columns={[
          {
            key: 'full_name',
            header: 'User',
            render: (user) => (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                  <Users size={16} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="font-bold text-foreground">{user.full_name || '—'}</p>
                  <p className="text-xs text-muted-foreground">{user.phone || 'No phone'}</p>
                </div>
              </div>
            ),
          },
          { key: 'email', header: 'Email' },
          {
            key: 'role',
            header: 'Role',
            render: (user) => (
              <StatusChip
                label={roleLabel(user.role_name || user.role || 'unknown')}
                tone="blue"
              />
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (user) => (
              <StatusChip
                label={user.is_active ? 'active' : 'inactive'}
                tone={user.is_active ? 'green' : 'purple'}
              />
            ),
          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (user) => (
              <RowActions
                items={[
                  {
                    key: 'view',
                    label: 'View',
                    icon: <Eye size={16} />,
                    onClick: () => openView(user),
                  },
                  {
                    key: 'password',
                    label: 'Password',
                    icon: <KeyRound size={16} />,
                    onClick: () => openChangePassword(user),
                  },
                ]}
                onEdit={() => openEdit(user)}
              />
            ),
          },
        ]}
        rows={list.rows}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No users found."
      />

      <FormDialog
        open={showModal}
        title={isCreate ? 'Add New User' : 'Edit User'}
        onClose={() => setShowModal(false)}
        maxWidth="2xl"
        footer={
          <FormDialogFooter
            onCancel={() => setShowModal(false)}
            submitLabel={isCreate ? 'Create User' : 'Save User'}
            submitting={submitting}
            formId="user-form"
          />
        }
      >
        <form id="user-form" onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <InputField
                label="Full Name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <InputField
              label="Email"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isCreate}
            />
            <InputField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Dropdown
              label="Role *"
              value={roleId}
              onChange={setRoleId}
              options={roleOptions}
              placeholder="Select a Role"
              filter
            />
            <Dropdown
              label="Status"
              value={status}
              onChange={(v) => setStatus(v as 'active' | 'inactive')}
              options={statusOptions}
              placeholder="Select status"
            />
            {requiresTenant && (
              <div className="sm:col-span-2">
                <Dropdown
                  label="Tenant *"
                  value={tenantId}
                  onChange={setTenantId}
                  options={tenantOptions}
                  placeholder="Select a Tenant"
                  filter
                  clearable
                />
              </div>
            )}
            {isCreate && (
              <>
                <PasswordField
                  label="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                />
                <PasswordField
                  label="Confirm Password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  minLength={8}
                />
              </>
            )}
          </div>
          {error && <ErrorBanner message={error} />}
          {!isCreate && selectedUser && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div>
                <h4 className="text-sm font-semibold">Change Password</h4>
                <p className="text-xs text-muted-foreground">
                  Set a new password for this user. They can sign in with it immediately.
                </p>
              </div>
              <PortButton variant="secondary" onClick={() => openChangePassword(selectedUser)}>
                <KeyRound size={16} />
                Change Password
              </PortButton>
            </div>
          )}
        </form>
      </FormDialog>

      <FormDialog
        open={showPasswordModal && Boolean(selectedUser)}
        title="Change Password"
        onClose={() => setShowPasswordModal(false)}
        maxWidth="md"
        footer={
          <FormDialogFooter
            onCancel={() => setShowPasswordModal(false)}
            submitLabel="Update Password"
            submitting={changingPassword}
            disabled={!newPassword.trim()}
            formId="password-form"
          />
        }
      >
        <form id="password-form" onSubmit={handleChangePassword} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {selectedUser?.full_name || selectedUser?.email}
          </p>
          <PasswordField
            label="New Password"
            required
            autoFocus
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            placeholder="Enter new password"
            hint="Minimum 6 characters. Old password is replaced immediately."
          />
          {passwordError && <ErrorBanner message={passwordError} />}
          {passwordSuccess && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
              {passwordSuccess}
            </div>
          )}
        </form>
      </FormDialog>

      <FormDialog
        open={showView && Boolean(selectedUser)}
        title="User Information"
        onClose={() => setShowView(false)}
        maxWidth="lg"
        footer={
          <>
            <PortButton
              variant="secondary"
              onClick={() => {
                if (!selectedUser) return;
                setShowView(false);
                openEdit(selectedUser);
              }}
            >
              Edit
            </PortButton>
            <PortButton variant="primary" onClick={() => setShowView(false)}>
              Close
            </PortButton>
          </>
        }
      >
        {selectedUser && (
          <>
            <div className="mb-6 flex flex-col items-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-border bg-accent text-3xl font-bold text-accent-foreground">
                {(selectedUser.full_name || '?').charAt(0).toUpperCase()}
              </div>
              <p className="mt-3 text-xl font-bold">{selectedUser.full_name}</p>
              <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-medium">{selectedUser.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Role</dt>
                <dd className="font-medium">
                  {roleLabel(selectedUser.role_name || selectedUser.role || '—')}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium">{selectedUser.is_active ? 'active' : 'inactive'}</dd>
              </div>
            </dl>
          </>
        )}
      </FormDialog>
    </>
  );
}
