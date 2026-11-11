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

type DepartmentRow = {
  id: string;
  name: string;
  description: string | null;
  headId: string | null;
  headName: string | null;
  active: boolean;
  programCount: number;
  subjectCount: number;
};

type FormState = {
  name: string;
  headId: string;
  description: string;
  active: boolean;
};

const emptyForm = (): FormState => ({ name: '', headId: '', description: '', active: true });

export default function DepartmentsPage() {
  const [rows, setRows] = useState<DepartmentRow[]>([]);
  const [headOptions, setHeadOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [headFilter, setHeadFilter] = useState('');

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/organization/departments');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load departments');
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setHeadOptions(Array.isArray(data.heads) ? data.heads : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load departments';
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
    items: rows as (DepartmentRow & Record<string, unknown>)[],
    searchKeys: ['name', 'description', 'headName'],
    filterKey: `${status}|${headFilter}`,
    filterFn: (row) =>
      (!status || (status === 'active' ? row.active : !row.active)) &&
      (!headFilter || row.headId === headFilter),
  });

  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((row) => row.active).length,
      subjects: rows.reduce((sum, row) => sum + row.subjectCount, 0),
      withoutHead: rows.filter((row) => !row.headId).length,
    }),
    [rows]
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (row: DepartmentRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      headId: row.headId ?? '',
      description: row.description ?? '',
      active: row.active,
    });
    setFormError(null);
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Department name is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/organization/departments', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: editingId ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save department');
      toast.success(editingId ? 'Department updated' : 'Department created');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ListPageShell
        title="Departments"
        description="Academic departments with their head, programs, and subject load."
        primaryAction={{ label: 'Add Department', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search departments or heads…"
        onResetFilters={() => {
          list.reset();
          setStatus('');
          setHeadFilter('');
        }}
        filters={[
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
          {
            key: 'head',
            label: 'Head',
            value: headFilter,
            options: headOptions,
            onChange: setHeadFilter,
          },
        ]}
        loading={loading}
        columns={[
          {
            key: 'name',
            header: 'Department',
            render: (row) => (
              <div>
                <div className="font-semibold">{row.name}</div>
                {row.description && (
                  <div className="line-clamp-1 text-xs text-muted-foreground">{row.description}</div>
                )}
              </div>
            ),
          },
          { key: 'head', header: 'Head', render: (row) => row.headName || '—' },
          { key: 'subjects', header: 'Subjects', align: 'center', render: (row) => row.subjectCount },
          { key: 'programs', header: 'Programs', align: 'center', render: (row) => row.programCount },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusChip
                label={row.active ? 'active' : 'inactive'}
                tone={statusToneFromValue(row.active ? 'active' : 'inactive')}
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
        rows={list.rows as DepartmentRow[]}
        rowKey={(row) => row.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No departments yet. Add one to group subjects and programs."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Departments" value={stats.total} accent="blue" />
          <StatCard label="Active" value={stats.active} accent="green" />
          <StatCard label="Subjects mapped" value={stats.subjects} accent="gold" />
          <StatCard label="No head assigned" value={stats.withoutHead} accent="purple" />
        </div>
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={open}
        title={editingId ? 'Edit Department' : 'Add Department'}
        onClose={() => setOpen(false)}
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel={editingId ? 'Save changes' : 'Create department'}
            submitting={saving}
            formId="department-form"
          />
        }
      >
        <form id="department-form" onSubmit={submit} className="space-y-4">
          <InputField
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Languages"
          />
          <Dropdown
            label="Department head"
            value={form.headId}
            onChange={(value) => setForm((prev) => ({ ...prev, headId: value }))}
            options={headOptions}
            placeholder="Not assigned"
            clearable
          />
          <TextAreaField
            label="Description"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="What this department covers"
          />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
              className="h-4 w-4 rounded border-border"
            />
            Active department
          </label>
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>
    </>
  );
}
