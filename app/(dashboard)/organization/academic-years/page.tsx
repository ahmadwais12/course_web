'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  RowActions,
  StatCard,
  StatusChip,
  statusToneFromValue,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { dateLabel } from '@/lib/display';

type YearRow = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  isActive: boolean;
  semesters: number;
  enrollments: number;
};

type FormState = {
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

const emptyForm = (): FormState => ({
  name: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
});

export default function AcademicYearsPage() {
  const [rows, setRows] = useState<YearRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/organization/academic-years');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load academic years');
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load academic years';
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
    items: rows as (YearRow & Record<string, unknown>)[],
    searchKeys: ['name'],
    filterKey: status,
    filterFn: (row) =>
      !status ||
      (status === 'current' && row.isCurrent) ||
      (status === 'active' && row.isActive && !row.isCurrent) ||
      (status === 'inactive' && !row.isActive),
  });

  const stats = useMemo(
    () => ({
      total: rows.length,
      current: rows.find((row) => row.isCurrent)?.name ?? 'Not set',
      active: rows.filter((row) => row.isActive).length,
      enrollments: rows.reduce((sum, row) => sum + row.enrollments, 0),
    }),
    [rows]
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (row: YearRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      startDate: row.startDate?.slice(0, 10) ?? '',
      endDate: row.endDate?.slice(0, 10) ?? '',
      isCurrent: row.isCurrent,
    });
    setFormError(null);
    setOpen(true);
  };

  const setCurrent = async (row: YearRow) => {
    try {
      const res = await fetch('/api/organization/academic-years', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, isCurrent: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set current year');
      toast.success(`${row.name} is now the current academic year`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to set current year');
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Enter a name for the academic year');
      return;
    }
    if (!form.startDate || !form.endDate) {
      setFormError('Choose both a start and end date');
      return;
    }
    if (form.endDate < form.startDate) {
      setFormError('End date must be after the start date');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/organization/academic-years', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: editingId ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save academic year');
      toast.success(editingId ? 'Academic year updated' : 'Academic year created');
      setOpen(false);
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save academic year';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ListPageShell
        title="Academic Years"
        description="Session calendar for the institute, with the current year and enrollment counts."
        primaryAction={{ label: 'Add Academic Year', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search academic years…"
        onResetFilters={() => {
          list.reset();
          setStatus('');
        }}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: status,
            options: [
              { value: 'current', label: 'Current' },
              { value: 'active', label: 'Active (not current)' },
              { value: 'inactive', label: 'Inactive' },
            ],
            onChange: setStatus,
          },
        ]}
        loading={loading}
        columns={[
          { key: 'name', header: 'Academic year', render: (row) => <span className="font-semibold">{row.name}</span> },
          {
            key: 'period',
            header: 'Period',
            render: (row) => (
              <span className="text-sm">
                {dateLabel(row.startDate)} → {dateLabel(row.endDate)}
              </span>
            ),
          },
          { key: 'semesters', header: 'Terms', align: 'center', render: (row) => row.semesters },
          { key: 'enrollments', header: 'Enrollments', align: 'center', render: (row) => row.enrollments },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <div className="flex flex-wrap gap-1.5">
                {row.isCurrent && <StatusChip label="current" tone="green" />}
                <StatusChip
                  label={row.isActive ? 'active' : 'inactive'}
                  tone={statusToneFromValue(row.isActive ? 'active' : 'inactive')}
                />
              </div>
            ),
          },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (row) => (
              <RowActions
                onEdit={() => openEdit(row)}
                overflow={
                  row.isCurrent
                    ? []
                    : [
                        {
                          key: 'current',
                          label: 'Set as current year',
                          icon: <CheckCircle2 size={16} />,
                          onClick: () => void setCurrent(row),
                        },
                      ]
                }
              />
            ),
          },
        ]}
        rows={list.rows as YearRow[]}
        rowKey={(row) => row.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No academic years yet. Add the first session to get started."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Academic years" value={stats.total} accent="blue" />
          <StatCard label="Current year" value={<span className="text-lg">{stats.current}</span>} accent="green" />
          <StatCard label="Active years" value={stats.active} accent="gold" />
          <StatCard label="Unmapped enrollments" value={stats.enrollments} accent="purple" />
        </div>
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={open}
        title={editingId ? 'Edit Academic Year' : 'Add Academic Year'}
        onClose={() => setOpen(false)}
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel={editingId ? 'Save changes' : 'Create year'}
            submitting={saving}
            formId="academic-year-form"
          />
        }
      >
        <form id="academic-year-form" onSubmit={submit} className="space-y-4">
          <InputField
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="2026 Academic Year"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Start date"
              required
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
            />
            <InputField
              label="End date"
              required
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isCurrent}
              onChange={(e) => setForm((prev) => ({ ...prev, isCurrent: e.target.checked }))}
              className="h-4 w-4 rounded border-border"
            />
            Set as the current academic year
          </label>
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>
    </>
  );
}
