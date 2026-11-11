'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleSlash, PauseCircle } from 'lucide-react';
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
import { dateLabel } from '@/lib/display';

type EnrollmentRow = {
  id: string;
  studentId: string | null;
  studentName: string;
  studentCode: string;
  classId: string | null;
  className: string;
  academicYearId: string | null;
  academicYear: string;
  enrollmentDate: string | null;
  status: string;
  grade: string | null;
  remarks: string | null;
};

type Option = { value: string; label: string };

type FormState = {
  studentId: string;
  classId: string;
  academicYearId: string;
  enrollmentDate: string;
  grade: string;
  remarks: string;
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'suspended', label: 'Suspended' },
];

const emptyForm = (): FormState => ({
  studentId: '',
  classId: '',
  academicYearId: '',
  enrollmentDate: new Date().toISOString().slice(0, 10),
  grade: '',
  remarks: '',
});

type EnrollmentManagerProps = {
  title: string;
  description: string;
  primaryLabel: string;
  emptyMessage: string;
};

export default function EnrollmentManager({
  title,
  description,
  primaryLabel,
  emptyMessage,
}: EnrollmentManagerProps) {
  const [rows, setRows] = useState<EnrollmentRow[]>([]);
  const [students, setStudents] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [years, setYears] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/academic/enrollment');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load enrollment');
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setStudents(Array.isArray(data.students) ? data.students : []);
      setClasses(Array.isArray(data.classes) ? data.classes : []);
      setYears(Array.isArray(data.academicYears) ? data.academicYears : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load enrollment';
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
    items: rows as (EnrollmentRow & Record<string, unknown>)[],
    searchKeys: ['studentName', 'studentCode', 'className', 'academicYear'],
    filterKey: `${status}|${classFilter}|${yearFilter}`,
    filterFn: (row) =>
      (!status || row.status === status) &&
      (!classFilter || row.classId === classFilter) &&
      (!yearFilter || row.academicYearId === yearFilter),
  });

  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((row) => row.status === 'active').length,
      completed: rows.filter((row) => row.status === 'completed').length,
      ended: rows.filter((row) => row.status === 'withdrawn' || row.status === 'suspended').length,
    }),
    [rows]
  );

  const updateStatus = async (id: string, next: string) => {
    try {
      const res = await fetch('/api/academic/enrollment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update enrollment');
      toast.success(`Enrollment marked ${next}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update enrollment');
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.studentId) {
      setFormError('Choose a student to enroll');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/academic/enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, status: 'active' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create enrollment');
      toast.success('Student enrolled');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create enrollment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ListPageShell
        title={title}
        description={description}
        primaryAction={{
          label: primaryLabel,
          onClick: () => {
            setForm(emptyForm());
            setFormError(null);
            setOpen(true);
          },
        }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search student, class, or year…"
        onResetFilters={() => {
          list.reset();
          setStatus('');
          setClassFilter('');
          setYearFilter('');
        }}
        filters={[
          { key: 'status', label: 'Status', value: status, options: STATUS_OPTIONS, onChange: setStatus },
          { key: 'class', label: 'Class', value: classFilter, options: classes, onChange: setClassFilter },
          { key: 'year', label: 'Academic year', value: yearFilter, options: years, onChange: setYearFilter },
        ]}
        loading={loading}
        columns={[
          {
            key: 'student',
            header: 'Student',
            render: (row) => (
              <div>
                <div className="font-semibold">{row.studentName}</div>
                <div className="text-xs text-muted-foreground">{row.studentCode}</div>
              </div>
            ),
          },
          { key: 'class', header: 'Class', render: (row) => row.className },
          { key: 'year', header: 'Academic year', render: (row) => row.academicYear },
          { key: 'date', header: 'Enrolled', render: (row) => dateLabel(row.enrollmentDate) },
          { key: 'grade', header: 'Grade', render: (row) => row.grade || '—' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusChip label={row.status} tone={statusToneFromValue(row.status)} />,
          },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (row) => (
              <RowActions
                overflow={[
                  {
                    key: 'active',
                    label: 'Mark active',
                    icon: <CheckCircle2 size={16} />,
                    onClick: () => void updateStatus(row.id, 'active'),
                    disabled: row.status === 'active',
                  },
                  {
                    key: 'complete',
                    label: 'Mark completed',
                    icon: <CheckCircle2 size={16} />,
                    onClick: () => void updateStatus(row.id, 'completed'),
                    disabled: row.status === 'completed',
                  },
                  {
                    key: 'suspend',
                    label: 'Suspend enrollment',
                    icon: <PauseCircle size={16} />,
                    onClick: () => void updateStatus(row.id, 'suspended'),
                    disabled: row.status === 'suspended',
                  },
                  {
                    key: 'withdraw',
                    label: 'Withdraw enrollment',
                    icon: <CircleSlash size={16} />,
                    onClick: () => void updateStatus(row.id, 'withdrawn'),
                    disabled: row.status === 'withdrawn',
                    danger: true,
                  },
                ]}
              />
            ),
          },
        ]}
        rows={list.rows as EnrollmentRow[]}
        rowKey={(row) => row.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage={emptyMessage}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Enrollments" value={stats.total} accent="blue" />
          <StatCard label="Active" value={stats.active} accent="green" />
          <StatCard label="Completed" value={stats.completed} accent="gold" />
          <StatCard label="Withdrawn / suspended" value={stats.ended} accent="purple" />
        </div>
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={open}
        title={primaryLabel}
        onClose={() => setOpen(false)}
        maxWidth="lg"
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel="Enroll student"
            submitting={saving}
            formId="enrollment-form"
          />
        }
      >
        <form id="enrollment-form" onSubmit={submit} className="space-y-4">
          <Dropdown
            label="Student"
            required
            value={form.studentId}
            onChange={(value) => setForm((prev) => ({ ...prev, studentId: value }))}
            options={students}
            placeholder="Choose a student"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Dropdown
              label="Class"
              value={form.classId}
              onChange={(value) => setForm((prev) => ({ ...prev, classId: value }))}
              options={classes}
              placeholder="Not assigned"
              clearable
            />
            <Dropdown
              label="Academic year"
              value={form.academicYearId}
              onChange={(value) => setForm((prev) => ({ ...prev, academicYearId: value }))}
              options={years}
              placeholder="Not linked"
              clearable
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Enrollment date"
              type="date"
              value={form.enrollmentDate}
              onChange={(e) => setForm((prev) => ({ ...prev, enrollmentDate: e.target.value }))}
            />
            <InputField
              label="Grade"
              value={form.grade}
              onChange={(e) => setForm((prev) => ({ ...prev, grade: e.target.value }))}
              placeholder="e.g. Grade 10"
            />
          </div>
          <TextAreaField
            label="Remarks"
            value={form.remarks}
            onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
          />
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>
    </>
  );
}
