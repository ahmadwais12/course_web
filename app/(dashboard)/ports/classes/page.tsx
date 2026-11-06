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
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';

type ClassRow = {
  id: string;
  name: string;
  grade?: string | null;
  year?: string | number | null;
  program_id?: string | null;
  student_count?: number;
  status: string;
  active?: boolean;
  created_at?: string | null;
};

type ProgramOption = { id: string; name: string };

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export default function PortableClassesPage() {
  const [items, setItems] = useState<ClassRow[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ClassRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [year, setYear] = useState('');
  const [programId, setProgramId] = useState('');
  const [formStatus, setFormStatus] = useState('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [classesRes, programsRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/programs'),
      ]);
      const classesData = await classesRes.json();
      if (!classesRes.ok) throw new Error(classesData.error || 'Failed to load classes');
      setItems(Array.isArray(classesData) ? classesData : []);

      if (programsRes.ok) {
        const programsData = await programsRes.json();
        setPrograms(
          Array.isArray(programsData)
            ? programsData.map((p: { id: string; name?: string }) => ({
                id: p.id,
                name: p.name || p.id,
              }))
            : []
        );
      }
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load classes';
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

  const programLabel = useCallback(
    (id?: string | null) => programs.find((p) => p.id === id)?.name || '—',
    [programs]
  );

  const filterFn = useCallback(
    (item: ClassRow) => !status || item.status === status,
    [status]
  );

  const list = useListQuery({
    items: items as (ClassRow & Record<string, unknown>)[],
    searchKeys: ['name', 'grade', 'year', 'status'],
    filterKey: status,
    filterFn: filterFn as (item: ClassRow & Record<string, unknown>) => boolean,
  });

  const programOptions = useMemo(
    () => programs.map((p) => ({ value: p.id, label: p.name })),
    [programs]
  );

  const resetForm = () => {
    setName('');
    setGrade('');
    setYear(String(new Date().getFullYear()));
    setProgramId('');
    setFormStatus('active');
    setFormError(null);
  };

  const openCreate = () => {
    resetForm();
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (row: ClassRow) => {
    setEditing(row);
    setName(row.name || '');
    setGrade(row.grade || '');
    setYear(row.year != null ? String(row.year) : '');
    setProgramId(row.program_id || '');
    setFormStatus(row.status || (row.active === false ? 'inactive' : 'active'));
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      const message = 'Class name is required';
      setFormError(message);
      toast.error(message);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(editing ? `/api/classes/${editing.id}` : '/api/classes', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          grade: grade.trim() || null,
          year: year.trim() || null,
          program_id: programId || null,
          status: formStatus,
          active: formStatus === 'active',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success(editing ? 'Class updated' : 'Class created');
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

  const handleDelete = async (row: ClassRow) => {
    if (!confirm(`Deactivate class "${row.name}"?`)) return;
    try {
      const res = await fetch(`/api/classes/${row.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast.success(`"${row.name}" deactivated`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <>
      <ListPageShell
        title="Class"
        description="Class groups used on Create Student & Parent (Class field)"
        primaryAction={{ label: 'Add Class', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search classes…"
        onResetFilters={() => {
          list.reset();
          setStatus('');
        }}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: status,
            options: STATUS_OPTIONS,
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
          { key: 'grade', header: 'Grade', render: (r) => r.grade || '—' },
          { key: 'year', header: 'Year', render: (r) => r.year ?? '—' },
          {
            key: 'program_id',
            header: 'Program',
            render: (r) => programLabel(r.program_id),
          },
          {
            key: 'student_count',
            header: 'Students',
            render: (r) => r.student_count ?? 0,
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <StatusChip label={r.status} tone={statusToneFromValue(r.status)} />
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
        rows={list.rows as ClassRow[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No classes yet. Add the first class."
      >
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={showModal}
        title={editing ? 'Edit Class' : 'Add Class'}
        onClose={() => setShowModal(false)}
        maxWidth="lg"
        footer={
          <FormDialogFooter
            onCancel={() => setShowModal(false)}
            submitLabel={editing ? 'Save Class' : 'Create Class'}
            submitting={submitting}
            formId="class-form"
          />
        }
      >
        <form id="class-form" onSubmit={handleSave} className="space-y-4">
          <InputField
            label="Class name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. IELTS Morning Batch A"
          />
          <Dropdown
            label="Program"
            value={programId}
            onChange={setProgramId}
            options={programOptions}
            placeholder={programOptions.length ? 'Select program' : 'No programs yet'}
            clearable
          />
          <InputField
            label="Grade / level label"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="e.g. Advanced"
          />
          <InputField
            label="Year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="e.g. 2026"
          />
          <Dropdown
            label="Status"
            value={formStatus}
            onChange={setFormStatus}
            options={STATUS_OPTIONS}
          />
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>
    </>
  );
}
