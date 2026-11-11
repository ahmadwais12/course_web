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
  statusToneFromValue,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { dateLabel } from '@/lib/display';

type TermRow = {
  id: string;
  name: string;
  code: string;
  academicYearId: string | null;
  academicYear: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
};

type FormState = {
  name: string;
  code: string;
  academicYearId: string;
  startDate: string;
  endDate: string;
};

const emptyForm = (): FormState => ({
  name: '',
  code: '',
  academicYearId: '',
  startDate: '',
  endDate: '',
});

export default function TermsPage() {
  const [rows, setRows] = useState<TermRow[]>([]);
  const [yearOptions, setYearOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState('');
  const [status, setStatus] = useState('');

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/organization/semesters');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load terms');
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setYearOptions(Array.isArray(data.academicYears) ? data.academicYears : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load terms';
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
    items: rows as (TermRow & Record<string, unknown>)[],
    searchKeys: ['name', 'code', 'academicYear'],
    filterKey: `${yearFilter}|${status}`,
    filterFn: (row) =>
      (!yearFilter || row.academicYearId === yearFilter) &&
      (!status || (status === 'active' ? row.isActive : !row.isActive)),
  });

  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((row) => row.isActive).length,
      years: new Set(rows.map((row) => row.academicYearId).filter(Boolean)).size,
      unassigned: rows.filter((row) => !row.academicYearId).length,
    }),
    [rows]
  );

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm(), academicYearId: yearFilter });
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (row: TermRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      code: row.code,
      academicYearId: row.academicYearId ?? '',
      startDate: row.startDate?.slice(0, 10) ?? '',
      endDate: row.endDate?.slice(0, 10) ?? '',
    });
    setFormError(null);
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.name.trim() || !form.code.trim()) {
      setFormError('Term name and code are required');
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
      const res = await fetch('/api/organization/semesters', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: editingId ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save term');
      toast.success(editingId ? 'Term updated' : 'Term created');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save term');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ListPageShell
        title="Terms"
        description="Semesters mapped to each academic year, with their teaching dates."
        primaryAction={{ label: 'Add Term', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search term name, code, or year…"
        onResetFilters={() => {
          list.reset();
          setYearFilter('');
          setStatus('');
        }}
        filters={[
          {
            key: 'year',
            label: 'Academic year',
            value: yearFilter,
            options: yearOptions,
            onChange: setYearFilter,
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
            header: 'Term',
            render: (row) => (
              <div>
                <div className="font-semibold">{row.name}</div>
                <div className="text-xs text-muted-foreground">{row.code}</div>
              </div>
            ),
          },
          { key: 'academicYear', header: 'Academic year', render: (row) => row.academicYear },
          {
            key: 'period',
            header: 'Period',
            render: (row) => (
              <span className="text-sm">
                {dateLabel(row.startDate)} → {dateLabel(row.endDate)}
              </span>
            ),
          },
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
        rows={list.rows as TermRow[]}
        rowKey={(row) => row.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No terms yet. Add the first term for an academic year."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Terms" value={stats.total} accent="blue" />
          <StatCard label="Active" value={stats.active} accent="green" />
          <StatCard label="Academic years covered" value={stats.years} accent="gold" />
          <StatCard label="Not linked to a year" value={stats.unassigned} accent="purple" />
        </div>
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={open}
        title={editingId ? 'Edit Term' : 'Add Term'}
        onClose={() => setOpen(false)}
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel={editingId ? 'Save changes' : 'Create term'}
            submitting={saving}
            formId="term-form"
          />
        }
      >
        <form id="term-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Term name"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Spring Term"
            />
            <InputField
              label="Code"
              required
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
              placeholder="SPR-2026"
            />
          </div>
          <Dropdown
            label="Academic year"
            value={form.academicYearId}
            onChange={(value) => setForm((prev) => ({ ...prev, academicYearId: value }))}
            options={yearOptions}
            placeholder="Not linked"
            clearable
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
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>
    </>
  );
}
