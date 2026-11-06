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

type ProgramRow = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  duration?: string | null;
  credits?: number | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export default function ProgramsPage() {
  const [items, setItems] = useState<ProgramRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ProgramRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [credits, setCredits] = useState('0');
  const [formStatus, setFormStatus] = useState('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/programs');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load programs');
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load programs';
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
    (item: ProgramRow) => !status || item.status === status,
    [status]
  );

  const list = useListQuery({
    items: items as (ProgramRow & Record<string, unknown>)[],
    searchKeys: ['name', 'code', 'description', 'duration', 'status'],
    filterKey: status,
    filterFn: filterFn as (item: ProgramRow & Record<string, unknown>) => boolean,
  });

  const resetForm = () => {
    setName('');
    setCode('');
    setDescription('');
    setDuration('');
    setCredits('0');
    setFormStatus('active');
    setFormError(null);
  };

  const openCreate = () => {
    resetForm();
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (row: ProgramRow) => {
    setEditing(row);
    setName(row.name || '');
    setCode(row.code || '');
    setDescription(row.description || '');
    setDuration(row.duration || '');
    setCredits(String(row.credits ?? 0));
    setFormStatus(row.status || 'active');
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      const message = 'Name and code are required';
      setFormError(message);
      toast.error(message);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(editing ? `/api/programs/${editing.id}` : '/api/programs', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim(),
          description: description.trim() || null,
          duration: duration.trim() || null,
          credits: Number(credits) || 0,
          status: formStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success(editing ? 'Program updated' : 'Program created');
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

  const handleDelete = async (row: ProgramRow) => {
    if (!confirm(`Deactivate program "${row.name}"?`)) return;
    try {
      const res = await fetch(`/api/programs/${row.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast.success(`"${row.name}" deactivated`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const statusOptions = useMemo(() => STATUS_OPTIONS, []);

  return (
    <>
      <ListPageShell
        title="Program"
        description="Academic programs used on Create Student & Parent (Program field)"
        primaryAction={{ label: 'Add Program', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search programs…"
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
          { key: 'code', header: 'Code', render: (r) => r.code || '—' },
          { key: 'duration', header: 'Duration', render: (r) => r.duration || '—' },
          { key: 'credits', header: 'Credits', render: (r) => r.credits ?? 0 },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <StatusChip
                label={r.status || 'active'}
                tone={statusToneFromValue(r.status || 'active')}
              />
            ),
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
        rows={list.rows as ProgramRow[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No programs yet. Add the first program."
      >
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={showModal}
        title={editing ? 'Edit Program' : 'Add Program'}
        onClose={() => setShowModal(false)}
        maxWidth="lg"
        footer={
          <FormDialogFooter
            onCancel={() => setShowModal(false)}
            submitLabel={editing ? 'Save Program' : 'Create Program'}
            submitting={submitting}
            formId="program-form"
          />
        }
      >
        <form id="program-form" onSubmit={handleSave} className="space-y-4">
          <InputField
            label="Program name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. IELTS Preparation"
          />
          <InputField
            label="Code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. IELTS-001"
          />
          <InputField
            label="Duration label"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 3 months"
            hint="Optional text on the program; student enrollment duration comes from Duration catalog"
          />
          <InputField
            label="Credits"
            type="number"
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
          />
          <Dropdown
            label="Status"
            value={formStatus}
            onChange={setFormStatus}
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
