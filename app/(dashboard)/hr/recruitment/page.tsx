'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ConfirmDialog,
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
import { dateLabel, money } from '@/lib/display';

type OpeningRow = {
  id: string;
  position_title: string;
  department: string | null;
  job_type: string;
  openings: number;
  applications_count: number;
  deadline_date: string | null;
  posted_date: string | null;
  status: string;
  description: string | null;
  requirements: string[];
  experience_required: number;
  salary_range_min: number | null;
  salary_range_max: number | null;
};

type Summary = {
  total: number;
  open: number;
  openings: number;
  applications: number;
};

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];
const STATUS_OPTIONS = ['Open', 'Closed', 'On Hold'];

const blankForm = () => ({
  positionTitle: '',
  department: '',
  jobType: 'Full-time',
  openings: '1',
  experienceRequired: '0',
  salaryRangeMin: '',
  salaryRangeMax: '',
  postedDate: new Date().toISOString().slice(0, 10),
  deadlineDate: '',
  status: 'Open',
  description: '',
  requirements: '',
});

type FormState = ReturnType<typeof blankForm>;

function salaryRange(row: OpeningRow) {
  if (row.salary_range_min === null && row.salary_range_max === null) return '—';
  if (row.salary_range_min !== null && row.salary_range_max !== null) {
    return `${money(row.salary_range_min)} – ${money(row.salary_range_max)}`;
  }
  return money(row.salary_range_min ?? row.salary_range_max ?? 0);
}

export default function RecruitmentPage() {
  const [items, setItems] = useState<OpeningRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [jobType, setJobType] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OpeningRow | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<OpeningRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/recruitment');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load recruitment');
      setItems(Array.isArray(data.rows) ? data.rows : []);
      setSummary(data.summary ?? null);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load recruitment';
      setItems([]);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm());
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (row: OpeningRow) => {
    setEditing(row);
    setForm({
      positionTitle: row.position_title,
      department: row.department ?? '',
      jobType: row.job_type,
      openings: String(row.openings || 1),
      experienceRequired: String(row.experience_required || 0),
      salaryRangeMin: row.salary_range_min === null ? '' : String(row.salary_range_min),
      salaryRangeMax: row.salary_range_max === null ? '' : String(row.salary_range_max),
      postedDate: row.posted_date ?? '',
      deadlineDate: row.deadline_date ?? '',
      status: row.status,
      description: row.description ?? '',
      requirements: (row.requirements ?? []).join('\n'),
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.positionTitle.trim()) {
      setFormError('Enter the position title.');
      return;
    }

    const payload = {
      positionTitle: form.positionTitle,
      department: form.department || null,
      jobType: form.jobType,
      openings: Number(form.openings) || 1,
      experienceRequired: Number(form.experienceRequired) || 0,
      salaryRangeMin: form.salaryRangeMin === '' ? null : Number(form.salaryRangeMin),
      salaryRangeMax: form.salaryRangeMax === '' ? null : Number(form.salaryRangeMax),
      postedDate: form.postedDate || null,
      deadlineDate: form.deadlineDate || null,
      status: form.status,
      description: form.description || null,
      requirements: form.requirements,
    };

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(
        editing ? `/api/hr/recruitment/${editing.id}` : '/api/hr/recruitment',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save opening');
      toast.success(editing ? 'Opening updated.' : 'Opening published.');
      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save opening';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/hr/recruitment/${deleting.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete opening');
      toast.success('Opening deleted.');
      setDeleting(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete opening');
    } finally {
      setSubmitting(false);
    }
  };

  const filterFn = useCallback(
    (item: OpeningRow) =>
      (!status || item.status === status) && (!jobType || item.job_type === jobType),
    [status, jobType]
  );

  const list = useListQuery({
    items: items as (OpeningRow & Record<string, unknown>)[],
    searchKeys: ['position_title', 'department', 'job_type', 'status'],
    filterKey: `${status}|${jobType}`,
    filterFn: filterFn as (item: OpeningRow & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(() => {
    const set = new Set(items.map((item) => item.status).filter(Boolean));
    return [...set].sort().map((value) => ({ value, label: value }));
  }, [items]);

  return (
    <>
      <ListPageShell
        title="Recruitment"
        description="Open positions, applicant counts, and hiring deadlines"
        primaryAction={{ label: 'New position', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search position, department, or type…"
        onResetFilters={() => {
          list.reset();
          setStatus('');
          setJobType('');
        }}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: status,
            options: statusOptions,
            onChange: setStatus,
          },
          {
            key: 'jobType',
            label: 'Job type',
            value: jobType,
            options: JOB_TYPES.map((type) => ({ value: type, label: type })),
            onChange: setJobType,
          },
        ]}
        loading={loading}
        columns={[
          {
            key: 'position_title',
            header: 'Position',
            render: (r) => (
              <div>
                <div className="font-semibold">{r.position_title}</div>
                <div className="text-xs text-muted-foreground">
                  Posted {dateLabel(r.posted_date)}
                </div>
              </div>
            ),
          },
          { key: 'department', header: 'Department', render: (r) => r.department || '—' },
          { key: 'job_type', header: 'Type' },
          { key: 'openings', header: 'Openings', align: 'right' },
          { key: 'applications_count', header: 'Applications', align: 'right' },
          { key: 'salary', header: 'Salary range', render: (r) => salaryRange(r) },
          { key: 'deadline_date', header: 'Deadline', render: (r) => dateLabel(r.deadline_date) },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <StatusChip label={r.status} tone={statusToneFromValue(r.status)} />
            ),
          },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (r) => (
              <RowActions onEdit={() => openEdit(r)} onDelete={() => setDeleting(r)} />
            ),
          },
        ]}
        rows={list.rows as OpeningRow[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No open positions. Publish one to start hiring."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Open positions" value={summary?.open ?? 0} accent="green" />
          <StatCard label="Openings" value={summary?.openings ?? 0} accent="blue" />
          <StatCard label="Applications" value={summary?.applications ?? 0} accent="purple" />
          <StatCard label="Total listings" value={summary?.total ?? 0} accent="gold" />
        </div>
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={dialogOpen}
        title={editing ? 'Edit Position' : 'New Position'}
        onClose={() => {
          if (submitting) return;
          setDialogOpen(false);
          setEditing(null);
        }}
        maxWidth="2xl"
      >
        <form id="opening-form" className="space-y-4" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Position title"
              value={form.positionTitle}
              onChange={(e) => setForm((prev) => ({ ...prev, positionTitle: e.target.value }))}
              required
            />
            <InputField
              label="Department"
              value={form.department}
              onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
              placeholder="e.g. Academic Affairs"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Dropdown
              label="Job type"
              value={form.jobType}
              onChange={(value) => setForm((prev) => ({ ...prev, jobType: value }))}
              options={JOB_TYPES.map((type) => ({ value: type, label: type }))}
              required
            />
            <InputField
              label="Openings"
              type="number"
              min="1"
              step="1"
              value={form.openings}
              onChange={(e) => setForm((prev) => ({ ...prev, openings: e.target.value }))}
            />
            <InputField
              label="Experience (years)"
              type="number"
              min="0"
              step="1"
              value={form.experienceRequired}
              onChange={(e) => setForm((prev) => ({ ...prev, experienceRequired: e.target.value }))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Salary from"
              type="number"
              min="0"
              step="0.01"
              value={form.salaryRangeMin}
              onChange={(e) => setForm((prev) => ({ ...prev, salaryRangeMin: e.target.value }))}
            />
            <InputField
              label="Salary to"
              type="number"
              min="0"
              step="0.01"
              value={form.salaryRangeMax}
              onChange={(e) => setForm((prev) => ({ ...prev, salaryRangeMax: e.target.value }))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <InputField
              label="Posted date"
              type="date"
              value={form.postedDate}
              onChange={(e) => setForm((prev) => ({ ...prev, postedDate: e.target.value }))}
            />
            <InputField
              label="Deadline"
              type="date"
              value={form.deadlineDate}
              onChange={(e) => setForm((prev) => ({ ...prev, deadlineDate: e.target.value }))}
            />
            <Dropdown
              label="Status"
              value={form.status}
              onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
              options={STATUS_OPTIONS.map((value) => ({ value, label: value }))}
              required
            />
          </div>

          <TextAreaField
            label="Description"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Role summary and responsibilities"
          />
          <TextAreaField
            label="Requirements"
            value={form.requirements}
            onChange={(e) => setForm((prev) => ({ ...prev, requirements: e.target.value }))}
            placeholder="One requirement per line"
            hint="Each line becomes a separate requirement."
          />
          {formError && <ErrorBanner message={formError} />}
        </form>
        <FormDialogFooter
          onCancel={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
          submitLabel={editing ? 'Save changes' : 'Publish position'}
          submitting={submitting}
          formId="opening-form"
        />
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete position"
        message={
          deleting
            ? `Delete "${deleting.position_title}"? Openings with applications cannot be deleted — close them instead.`
            : ''
        }
        confirmLabel="Delete"
        submitting={submitting}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
