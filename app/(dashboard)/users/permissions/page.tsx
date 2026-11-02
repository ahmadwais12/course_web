'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import type { PermissionRow } from '@/lib/rbac';
import { useListQuery } from '@/hooks/useListQuery';
import {
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  RowActions,
} from '@/components/ports';

export default function PermissionsPage() {
  const [items, setItems] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<PermissionRow | null>(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/permissions');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load permissions';
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
    items: items as (PermissionRow & Record<string, unknown>)[],
    searchKeys: ['name', 'guard_name'],
  });

  const openAdd = () => {
    setEditing(null);
    setName('');
    setError(null);
    setShowDialog(true);
  };

  const openEdit = (item: PermissionRow) => {
    setEditing(item);
    setName(item.name);
    setError(null);
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditing(null);
    setName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(editing ? `/api/permissions/${editing.id}` : '/api/permissions', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      closeDialog();
      toast.success(editing ? 'Permission updated successfully' : 'Permission created successfully');
      await fetchAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: PermissionRow) => {
    if (!confirm(`Delete permission "${item.name}"?`)) return;
    try {
      const res = await fetch(`/api/permissions/${item.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast.success(`Permission "${item.name}" deleted`);
      await fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <>
      <ListPageShell
        title="Permissions Management"
        description="Manage system permissions and access controls (KMS workflow)."
        primaryAction={{ label: 'Add Permission', onClick: openAdd }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search permissions…"
        onResetFilters={list.reset}
        loading={loading}
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (item) => (
              <span className="inline-flex items-center gap-2 font-semibold text-foreground">
                <KeyRound size={14} className="text-primary" />
                {item.name}
              </span>
            ),
          },
          {
            key: 'guard_name',
            header: 'Guard',
          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (item) => (
              <RowActions onEdit={() => openEdit(item)} onDelete={() => handleDelete(item)} />
            ),
          },
        ]}
        rows={list.rows as PermissionRow[]}
        rowKey={(item) => item.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No permissions yet. Run sql/rbac_kms_style.sql or add one."
      >
        {error && !showDialog && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={showDialog}
        title={editing ? 'Edit Permission' : 'Add New Permission'}
        onClose={closeDialog}
        maxWidth="md"
        footer={
          <FormDialogFooter
            onCancel={closeDialog}
            submitLabel={editing ? 'Update' : 'Create'}
            submitting={submitting}
            formId="permission-form"
          />
        }
      >
        <form id="permission-form" onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Permission Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Students, Add Vehicles, Team"
          />
          <p className="text-xs text-muted-foreground">
            Use Title Case names like KMS (page access or actions).
          </p>
          {error && showDialog && <ErrorBanner message={error} />}
        </form>
      </FormDialog>
    </>
  );
}
