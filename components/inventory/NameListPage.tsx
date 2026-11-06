'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import {
  ConfirmDialog,
  DetailDialog,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  RowActions,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';

type Row = { id: string; name: string; created_at?: string };

/** Shared add/edit list for inventory units and warehouses. */
export default function NameListPage({
  title,
  description,
  endpoint,
  nameLabel,
  addLabel,
  emptyMessage,
}: {
  title: string;
  description: string;
  endpoint: string;
  nameLabel: string;
  addLabel: string;
  emptyMessage: string;
}) {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load';
      setItems([]);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  const list = useListQuery({
    items: items as (Row & Record<string, unknown>)[],
    searchKeys: ['name'],
  });

  const startCreate = () => {
    setEditing(null);
    setName('');
    setFormError(null);
    setOpen(true);
  };

  const startEdit = (row: Row) => {
    setEditing(row);
    setName(row.name);
    setFormError(null);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(editing ? `${endpoint}/${editing.id}` : endpoint, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success(editing ? 'Saved' : 'Created');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Row) => {
    const res = await fetch(`${endpoint}/${row.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || 'Delete failed');
      return;
    }
    toast.success('Deleted');
    await load();
  };

  return (
    <>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <ListPageShell
        title={title}
        description={description}
        primaryAction={{ label: addLabel, onClick: startCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder={`Search ${title.toLowerCase()}…`}
        columns={[
          { key: 'name', header: nameLabel },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) => (
              <div className="flex justify-end">
                <RowActions
                  items={[{ key: 'view', label: 'Details', icon: <Eye size={16} />, onClick: () => setViewing(row as Row) }]}
                  onEdit={() => startEdit(row as Row)}
                  onDelete={() => setPendingDelete(row as Row)}
                />
              </div>
            ),
          },
        ]}
        rows={list.rows}
        rowKey={(row) => String(row.id)}
        loading={loading}
        emptyMessage={emptyMessage}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
      />
      <FormDialog
        open={open}
        title={editing ? `Edit ${nameLabel}` : addLabel}
        onClose={() => setOpen(false)}
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel="Save"
            submitting={saving}
            formId="inventory-name-form"
          />
        }
      >
        <form
          id="inventory-name-form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {formError && (
            <div className="mb-3">
              <ErrorBanner message={formError} />
            </div>
          )}
          <InputField label={nameLabel} value={name} onChange={(e) => setName(e.target.value)} required />
        </form>
      </FormDialog>
      <DetailDialog
        open={Boolean(viewing)}
        title={viewing?.name || nameLabel}
        onClose={() => setViewing(null)}
        rows={viewing ? [{ label: nameLabel, value: viewing.name }] : []}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${nameLabel.toLowerCase()}`}
        message={pendingDelete ? `Delete ${pendingDelete.name}?` : ''}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          const row = pendingDelete;
          setPendingDelete(null);
          await remove(row);
        }}
      />
    </>
  );
}
