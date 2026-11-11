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
  StatCard,
  StatusChip,
  TextAreaField,
  statusToneFromValue,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';

type SubjectRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  departmentId: string | null;
  department: string;
  credits: number;
  classLinks: number;
  isActive: boolean;
};

type FormState = {
  name: string;
  code: string;
  departmentId: string;
  credits: string;
  description: string;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  name: '',
  code: '',
  departmentId: '',
  credits: '0',
  description: '',
  isActive: true,
});

export default function SubjectsPage() {
  const [rows, setRows] = useState<SubjectRow[]>([]);
  const [departments, setDepartments] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/academic/subjects');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load subjects');
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setDepartments(Array.isArray(data.departments) ? data.departments : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load subjects';
      setRows([]);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const list = useListQuery({
    items: rows as (SubjectRow & Record<string, unknown>)[],
    searchKeys: ['name', 'code', 'department'],
    filterKey: `${department}|${status}`,
    filterFn: (row) =>
      (!department || row.departmentId === department) &&
      (!status || (status === 'active' ? row.isActive : !row.isActive)),
  });

  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((row) => row.isActive).length,
      linked: rows.filter((row) => row.classLinks > 0).length,
      credits: rows.reduce((sum, row) => sum + row.credits, 0),
    }),
    [rows]
  );

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm(), departmentId: department });
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (row: SubjectRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      code: row.code,
      departmentId: row.departmentId ?? '',
      credits: String(row.credits),
      description: row.description ?? '',
      isActive: row.isActive,
    });
    setFormError(null);
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.name.trim() || !form.code.trim()) {
      setFormError('Subject name and code are required');
      return;
    }
    const credits = Number(form.credits);
    if (!Number.isFinite(credits) || credits < 0) {
      setFormError('Credits must be zero or more');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/academic/subjects', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, credits, id: editingId ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save subject');
      toast.success(editingId ? 'Subject updated' : 'Subject created');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save subject');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ListPageShell
        title="Subjects"
        description="The subject catalogue mapped to departments and class schedules."
        primaryAction={{ label: 'Add Subject', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search subject or code…"
        onResetFilters={() => {
          list.reset();
          setDepartment('');
          setStatus('');
        }}
        filters={[
          {
            key: 'department',
            label: 'Department',
            value: department,
            options: departments,
            onChange: setDepartment,
          },
          {
            key: 'status',
            label: 'Status',
            value: status,
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ],
            onChange: setStatus,
          },
        ]}
        loading={loading}
        columns={[
          {
            key: 'name',
            header: 'Subject',
            render: (row) => (
              <div>
                <div className="font-semibold">{row.name}</div>
                <div className="text-xs text-muted-foreground">{row.code}</div>
              </div>
            ),
          },
          { key: 'department', header: 'Department', render: (row) => row.department },
          { key: 'credits', header: 'Credits', align: 'center', render: (row) => row.credits },
          { key: 'classLinks', header: 'Classes', align: 'center', render: (row) => row.classLinks },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusChip
                label={row.isActive ? 'active' : 'inactive'}
                tone={statusToneFromValue(row.isActive ? 'active' : 'inactive')}
              />
            ),
          },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (row) => <RowActions onEdit={() => openEdit(row)} />,
          },
        ]}
        rows={list.rows as SubjectRow[]}
        rowKey={(row) => row.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No subjects yet. Add the first subject to build class schedules."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Subjects" value={stats.total} accent="blue" />
          <StatCard label="Active" value={stats.active} accent="green" />
          <StatCard label="Used in classes" value={stats.linked} accent="gold" />
          <StatCard label="Total credits" value={stats.credits} accent="purple" />
        </div>
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={open}
        title={editingId ? 'Edit Subject' : 'Add Subject'}
        onClose={() => setOpen(false)}
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel={editingId ? 'Save changes' : 'Create subject'}
            submitting={saving}
            formId="subject-form"
          />
        }
      >
        <form id="subject-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Subject name"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Mathematics"
            />
            <InputField
              label="Code"
              required
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
              placeholder="MATH-01"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Dropdown
              label="Department"
              value={form.departmentId}
              onChange={(value) => setForm((prev) => ({ ...prev, departmentId: value }))}
              options={departments}
              placeholder="Not assigned"
              clearable
            />
            <InputField
              label="Credits"
              type="number"
              min="0"
              step="1"
              value={form.credits}
              onChange={(e) => setForm((prev) => ({ ...prev, credits: e.target.value }))}
            />
          </div>
          <TextAreaField
            label="Description"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="What the subject covers"
          />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-border"
            />
            Active subject
          </label>
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>
    </>
  );
}
