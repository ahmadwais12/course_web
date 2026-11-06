'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import {
  ConfirmDialog,
  DetailDialog,
  Dropdown,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  RowActions,
  StatusChip,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { PROPERTY_TYPES } from '@/lib/asset-options';

type Property = { id: string; type: string; description: string };

export default function PropertiesPage() {
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [type, setType] = useState('Category');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Property | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Property | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/properties');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load properties');
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = useListQuery({
    items: items as (Property & Record<string, unknown>)[],
    searchKeys: ['type', 'description'],
    filterKey: typeFilter,
    filterFn: ((row: Property) => !typeFilter || row.type === typeFilter) as (
      row: Property & Record<string, unknown>
    ) => boolean,
  });

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(editing ? `/api/inventory/properties/${editing.id}` : '/api/inventory/properties', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success('Saved');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (property: Property) => {
    const res = await fetch(`/api/inventory/properties/${property.id}`, { method: 'DELETE' });
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
        title="Asset Properties"
        description="Lookup values used on assets: categories, departments, locations, and provinces."
        primaryAction={{
          label: 'New property',
          onClick: () => {
            setEditing(null);
            setType('Category');
            setDescription('');
            setFormError(null);
            setOpen(true);
          },
        }}
        search={list.search}
        onSearchChange={list.setSearch}
        filters={[
          {
            key: 'type',
            label: 'Type',
            value: typeFilter,
            onChange: setTypeFilter,
            options: PROPERTY_TYPES.map((item) => ({ value: item, label: item })),
          },
        ]}
        onResetFilters={() => {
          setTypeFilter('');
          list.reset();
        }}
        columns={[
          { key: 'type', header: 'Type', render: (row) => <StatusChip label={String(row.type)} /> },
          { key: 'description', header: 'Description' },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) => (
              <div className="flex justify-end">
                <RowActions
                  onEdit={() => {
                    const property = row as Property;
                    setEditing(property);
                    setType(property.type);
                    setDescription(property.description);
                    setOpen(true);
                  }}
                  items={[{ key: 'view', label: 'Details', icon: <Eye size={16} />, onClick: () => setViewing(row as Property) }]}
                  onDelete={() => setPendingDelete(row as Property)}
                />
              </div>
            ),
          },
        ]}
        rows={list.rows}
        rowKey={(row) => String(row.id)}
        loading={loading}
        emptyMessage="No asset properties yet."
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
      />
      <FormDialog
        open={open}
        title={editing ? 'Edit property' : 'New property'}
        onClose={() => setOpen(false)}
        footer={<FormDialogFooter onCancel={() => setOpen(false)} submitLabel="Save" submitting={saving} formId="property-form" />}
      >
        <form
          id="property-form"
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {formError && <ErrorBanner message={formError} />}
          <Dropdown
            label="Type"
            value={type}
            onChange={setType}
            options={PROPERTY_TYPES.map((item) => ({ value: item, label: item }))}
          />
          <InputField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </form>
      </FormDialog>
      <DetailDialog
        open={Boolean(viewing)}
        title={viewing?.description || 'Property'}
        onClose={() => setViewing(null)}
        rows={viewing ? [{ label: 'Type', value: viewing.type }, { label: 'Description', value: viewing.description }] : []}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete property"
        message={pendingDelete ? `Delete ${pendingDelete.description}?` : ''}
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
