'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dropdown,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  RowActions,
  StatusChip,
  statusToneFromValue,
  TextAreaField,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { toSlug } from '@/lib/business';
import {
  MESSAGING_TYPE_STATUSES,
  hydrateMessagingType,
  type MessagingTypeRow,
  type MessagingTypeStatus,
} from '@/lib/messaging-types';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export default function MessagingTypesPage() {
  const [items, setItems] = useState<MessagingTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MessagingTypeRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [formStatus, setFormStatus] = useState<MessagingTypeStatus>('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/messaging-types');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load messaging types');
      setItems((Array.isArray(data) ? data : []).map((row) => hydrateMessagingType(row)));
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load messaging types';
      setItems([]);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filterFn = useCallback(
    (item: MessagingTypeRow) => !status || item.status === status,
    [status]
  );

  const list = useListQuery({
    items: items as (MessagingTypeRow & Record<string, unknown>)[],
    searchKeys: ['name', 'slug', 'description', 'status', 'id'],
    filterKey: status,
    filterFn: filterFn as (item: MessagingTypeRow & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(
    () => MESSAGING_TYPE_STATUSES.map((s) => ({ value: s.value, label: s.label })),
    []
  );

  const resetForm = () => {
    setName('');
    setSlug('');
    setSlugTouched(false);
    setDescription('');
    setFormStatus('active');
    setFormError(null);
  };

  const openCreate = () => {
    resetForm();
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (row: MessagingTypeRow) => {
    setEditing(row);
    setName(row.name);
    setSlug(row.slug);
    setSlugTouched(true);
    setDescription(row.description || '');
    setFormStatus(row.status || (row.is_active ? 'active' : 'inactive'));
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      const message = 'Name and slug are required';
      setFormError(message);
      toast.error(message);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(editing ? `/api/messaging-types/${editing.id}` : '/api/messaging-types', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          status: formStatus,
          is_active: formStatus === 'active',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success(editing ? 'Messaging type updated' : 'Messaging type created');
      setShowModal(false);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row: MessagingTypeRow) => {
    if (!confirm(`Delete messaging type "${row.name}"?`)) return;
    try {
      const res = await fetch(`/api/messaging-types/${row.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast.success(`"${row.name}" deleted`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <>
      <ListPageShell
        title="Messaging Types"
        description="Lookup types used when starting chats (direct, group, channel, …)"
        primaryAction={{ label: 'Add Type', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search messaging types…"
        onResetFilters={() => {
          list.reset();
          setStatus('');
        }}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: status,
            options: statusOptions,
            onChange: setStatus,
          },
        ]}
        loading={loading}
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (r) => <span className="font-semibold">{r.name || '—'}</span>,
          },
          {
            key: 'slug',
            header: 'Slug',
            render: (r) => r.slug || '—',
          },
          {
            key: 'description',
            header: 'Description',
            className: 'w-[16rem] max-w-[16rem]',
            render: (r) => (
              <span className="block w-[16rem] max-w-[16rem] truncate" title={r.description || ''}>
                {r.description || '—'}
              </span>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => {
              const label = r.status || (r.is_active ? 'active' : 'inactive');
              return <StatusChip label={label} tone={statusToneFromValue(label)} />;
            },
          },
          {
            key: 'is_active',
            header: 'Active',
            render: (r) => {
              const label = r.is_active ? 'yes' : 'no';
              return <StatusChip label={label} tone={r.is_active ? 'green' : 'purple'} />;
            },
          },
          {
            key: 'created_at',
            header: 'Created',
            render: (r) => formatDateTime(r.created_at),
          },
          {
            key: 'updated_at',
            header: 'Updated',
            render: (r) => formatDateTime(r.updated_at),
          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (r) => (
              <RowActions onEdit={() => openEdit(r)} onDelete={() => handleDelete(r)} />
            ),
          },
        ]}
        rows={list.rows as MessagingTypeRow[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No messaging types yet. Add the first type."
      >
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={showModal}
        title={editing ? 'Edit Messaging Type' : 'Add Messaging Type'}
        onClose={() => setShowModal(false)}
        maxWidth="lg"
        footer={
          <FormDialogFooter
            onCancel={() => setShowModal(false)}
            submitLabel={editing ? 'Save Type' : 'Create Type'}
            submitting={submitting}
            formId="messaging-type-form"
          />
        }
      >
        <form id="messaging-type-form" onSubmit={handleSave} className="space-y-4">
          <InputField
            label="Type name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(toSlug(e.target.value));
            }}
            placeholder="e.g. Direct"
          />
          <InputField
            label="Slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(toSlug(e.target.value));
            }}
          />
          <Dropdown
            label="Status"
            value={formStatus}
            onChange={(v) => setFormStatus(v as MessagingTypeStatus)}
            options={statusOptions}
          />
          <TextAreaField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>
    </>
  );
}
