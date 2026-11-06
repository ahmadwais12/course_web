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
  STUDENT_LEVEL_STATUSES,
  hydrateStudentLevel,
  type StudentLevelRow,
  type StudentLevelStatus,
} from '@/lib/student-levels';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export default function StudentLevelsPage() {
  const [items, setItems] = useState<StudentLevelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StudentLevelRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [formStatus, setFormStatus] = useState<StudentLevelStatus>('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/student-levels');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load student levels');
      setItems((Array.isArray(data) ? data : []).map((row) => hydrateStudentLevel(row)));
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load student levels';
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
    (item: StudentLevelRow) => !status || item.status === status,
    [status]
  );

  const list = useListQuery({
    items: items as (StudentLevelRow & Record<string, unknown>)[],
    searchKeys: ['name', 'slug', 'description', 'status', 'id'],
    filterKey: status,
    filterFn: filterFn as (item: StudentLevelRow & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(
    () => STUDENT_LEVEL_STATUSES.map((s) => ({ value: s.value, label: s.label })),
    []
  );

  const resetForm = () => {
    setName('');
    setSlug('');
    setSlugTouched(false);
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

  const openEdit = (row: StudentLevelRow) => {
    setEditing(row);
    setName(row.name);
    setSlug(row.slug);
    setSlugTouched(true);
    setDescription(row.description || '');
    setSortOrder(String(row.sort_order ?? 0));
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
      const res = await fetch(editing ? `/api/student-levels/${editing.id}` : '/api/student-levels', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          sort_order: Number(sortOrder) || 0,
          status: formStatus,
          is_active: formStatus === 'active',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success(editing ? 'Student level updated' : 'Student level created');
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

  const handleDelete = async (row: StudentLevelRow) => {
    if (!confirm(`Delete student level "${row.name}"?`)) return;
    try {
      const res = await fetch(`/api/student-levels/${row.id}`, { method: 'DELETE' });
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
        title="Student Level"
        description="Proficiency levels used when creating student & parent accounts"
        primaryAction={{ label: 'Add Level', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search student levels…"
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
            key: 'sort_order',
            header: 'Order',
            render: (r) => r.sort_order ?? 0,
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
        rows={list.rows as StudentLevelRow[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No student levels yet. Add the first level."
      >
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={showModal}
        title={editing ? 'Edit Student Level' : 'Add Student Level'}
        onClose={() => setShowModal(false)}
        maxWidth="lg"
        footer={
          <FormDialogFooter
            onCancel={() => setShowModal(false)}
            submitLabel={editing ? 'Save Level' : 'Create Level'}
            submitting={submitting}
            formId="student-level-form"
          />
        }
      >
        <form id="student-level-form" onSubmit={handleSave} className="space-y-4">
          <InputField
            label="Level name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(toSlug(e.target.value));
            }}
            placeholder="e.g. Beginner"
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
          <InputField
            label="Sort order"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            hint="Lower numbers appear first in Create Student"
          />
          <Dropdown
            label="Status"
            value={formStatus}
            onChange={(v) => setFormStatus(v as StudentLevelStatus)}
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
