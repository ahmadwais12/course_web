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
  DURATION_STATUSES,
  hydrateDuration,
  type DurationRow,
  type DurationStatus,
} from '@/lib/durations';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export default function DurationsPage() {
  const [items, setItems] = useState<DurationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DurationRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [months, setMonths] = useState('6');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [formStatus, setFormStatus] = useState<DurationStatus>('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/durations');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load durations');
      setItems((Array.isArray(data) ? data : []).map((row) => hydrateDuration(row)));
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load durations';
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
    (item: DurationRow) => !status || item.status === status,
    [status]
  );

  const list = useListQuery({
    items: items as (DurationRow & Record<string, unknown>)[],
    searchKeys: ['name', 'slug', 'description', 'status'],
    filterKey: status,
    filterFn: filterFn as (item: DurationRow & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(
    () => DURATION_STATUSES.map((s) => ({ value: s.value, label: s.label })),
    []
  );

  const resetForm = () => {
    setName('');
    setSlug('');
    setSlugTouched(false);
    setMonths('6');
    setDescription('');
    setSortOrder(String((items.length + 1) * 10));
    setFormStatus('active');
    setFormError(null);
  };

  const openCreate = () => {
    resetForm();
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (row: DurationRow) => {
    setEditing(row);
    setName(row.name);
    setSlug(row.slug);
    setSlugTouched(true);
    setMonths(String(row.months));
    setDescription(row.description || '');
    setSortOrder(String(row.sort_order ?? 0));
    setFormStatus(row.status || (row.is_active ? 'active' : 'inactive'));
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !Number(months)) {
      const message = 'Name and months are required';
      setFormError(message);
      toast.error(message);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(editing ? `/api/durations/${editing.id}` : '/api/durations', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || toSlug(name),
          months: Number(months),
          description: description.trim() || null,
          sort_order: Number(sortOrder) || 0,
          status: formStatus,
          is_active: formStatus === 'active',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success(editing ? 'Duration updated' : 'Duration created');
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

  const handleDelete = async (row: DurationRow) => {
    if (!confirm(`Delete duration "${row.name}"?`)) return;
    try {
      const res = await fetch(`/api/durations/${row.id}`, { method: 'DELETE' });
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
        title="Duration"
        description="Enrollment lengths used on Create Student & Parent (Duration field)"
        primaryAction={{ label: 'Add Duration', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search durations…"
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
          { key: 'months', header: 'Months', render: (r) => r.months },
          { key: 'slug', header: 'Slug', render: (r) => r.slug || '—' },
          { key: 'sort_order', header: 'Order', render: (r) => r.sort_order ?? 0 },
          {
            key: 'status',
            header: 'Status',
            render: (r) => {
              const label = r.status || (r.is_active ? 'active' : 'inactive');
              return <StatusChip label={label} tone={statusToneFromValue(label)} />;
            },
          },
          {
            key: 'created_at',
            header: 'Created',
            render: (r) => formatDateTime(r.created_at),
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
        rows={list.rows as DurationRow[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No durations yet. Add 4 / 6 / 12 months to start."
      >
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={showModal}
        title={editing ? 'Edit Duration' : 'Add Duration'}
        onClose={() => setShowModal(false)}
        maxWidth="lg"
        footer={
          <FormDialogFooter
            onCancel={() => setShowModal(false)}
            submitLabel={editing ? 'Save Duration' : 'Create Duration'}
            submitting={submitting}
            formId="duration-form"
          />
        }
      >
        <form id="duration-form" onSubmit={handleSave} className="space-y-4">
          <InputField
            label="Duration name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(toSlug(e.target.value));
            }}
            placeholder="e.g. 6 Months"
          />
          <InputField
            label="Slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(toSlug(e.target.value));
            }}
          />
          <InputField
            label="Months"
            type="number"
            required
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            hint="Stored on the student as duration_months"
          />
          <InputField
            label="Sort order"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
          <Dropdown
            label="Status"
            value={formStatus}
            onChange={(v) => setFormStatus(v as DurationStatus)}
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
