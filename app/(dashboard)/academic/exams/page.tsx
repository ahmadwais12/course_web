'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CircleSlash, PlayCircle } from 'lucide-react';
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

type ExamRow = {
  id: string;
  name: string;
  examType: string;
  subject: string | null;
  classId: string | null;
  className: string;
  examDate: string | null;
  startTime: string | null;
  endTime: string | null;
  totalMarks: number;
  passingMarks: number;
  status: string;
  description: string | null;
  grades: number;
};

type FormState = {
  name: string;
  examType: string;
  subject: string;
  classId: string;
  examDate: string;
  startTime: string;
  endTime: string;
  totalMarks: string;
  passingMarks: string;
  status: string;
  description: string;
};

const EXAM_TYPES = [
  { value: 'midterm', label: 'Midterm' },
  { value: 'final', label: 'Final' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'placement', label: 'Placement' },
  { value: 'mock', label: 'Mock' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const emptyForm = (): FormState => ({
  name: '',
  examType: 'final',
  subject: '',
  classId: '',
  examDate: new Date().toISOString().slice(0, 10),
  startTime: '09:00',
  endTime: '11:00',
  totalMarks: '100',
  passingMarks: '50',
  status: 'scheduled',
  description: '',
});

export default function ExamsPage() {
  const [rows, setRows] = useState<ExamRow[]>([]);
  const [classes, setClasses] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [status, setStatus] = useState('');
  const [classFilter, setClassFilter] = useState('');

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/academic/exams');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load exams');
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setClasses(Array.isArray(data.classes) ? data.classes : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load exams';
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
    items: rows as (ExamRow & Record<string, unknown>)[],
    searchKeys: ['name', 'subject', 'className'],
    filterKey: `${typeFilter}|${status}|${classFilter}`,
    filterFn: (row) =>
      (!typeFilter || row.examType === typeFilter) &&
      (!status || row.status === status) &&
      (!classFilter || row.classId === classFilter),
  });

  const stats = useMemo(
    () => ({
      total: rows.length,
      scheduled: rows.filter((row) => row.status === 'scheduled').length,
      completed: rows.filter((row) => row.status === 'completed').length,
      graded: rows.reduce((sum, row) => sum + row.grades, 0),
    }),
    [rows]
  );

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setOpen(true);
  };

  const updateStatus = async (row: ExamRow, next: string) => {
    try {
      const res = await fetch('/api/academic/exams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update exam');
      toast.success(`Exam marked ${next.replaceAll('_', ' ')}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update exam');
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Exam name is required');
      return;
    }
    const total = Number(form.totalMarks);
    const passing = Number(form.passingMarks);
    if (!Number.isFinite(total) || total <= 0) {
      setFormError('Total marks must be greater than zero');
      return;
    }
    if (!Number.isFinite(passing) || passing < 0 || passing > total) {
      setFormError('Passing marks must be within total marks');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/academic/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, totalMarks: total, passingMarks: passing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create exam');
      toast.success('Exam scheduled');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create exam');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ListPageShell
        title="Exams"
        description="Exam calendar with marks, passing thresholds, and grading progress."
        primaryAction={{ label: 'Schedule Exam', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search exam, subject, or class…"
        onResetFilters={() => {
          list.reset();
          setTypeFilter('');
          setStatus('');
          setClassFilter('');
        }}
        filters={[
          { key: 'type', label: 'Exam type', value: typeFilter, options: EXAM_TYPES, onChange: setTypeFilter },
          { key: 'status', label: 'Status', value: status, options: STATUS_OPTIONS, onChange: setStatus },
          { key: 'class', label: 'Class', value: classFilter, options: classes, onChange: setClassFilter },
        ]}
        loading={loading}
        columns={[
          {
            key: 'name',
            header: 'Exam',
            render: (row) => (
              <div>
                <div className="font-semibold">{row.name}</div>
                <div className="text-xs text-muted-foreground">
                  {[row.subject, row.className].filter(Boolean).join(' · ')}
                </div>
              </div>
            ),
          },
          {
            key: 'type',
            header: 'Type',
            render: (row) => EXAM_TYPES.find((t) => t.value === row.examType)?.label ?? row.examType,
          },
          { key: 'date', header: 'Date', render: (row) => dateLabel(row.examDate) },
          {
            key: 'time',
            header: 'Time',
            render: (row) =>
              row.startTime && row.endTime ? `${row.startTime.slice(0, 5)} – ${row.endTime.slice(0, 5)}` : '—',
          },
          {
            key: 'marks',
            header: 'Marks',
            align: 'center',
            render: (row) => (
              <span className="text-sm">
                {row.passingMarks} / {row.totalMarks}
              </span>
            ),
          },
          { key: 'grades', header: 'Grades', align: 'center', render: (row) => row.grades },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusChip label={row.status.replaceAll('_', ' ')} tone={statusToneFromValue(row.status)} />
            ),
          },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (row) => (
              <RowActions
                overflow={[
                  ...(row.status === 'scheduled' || row.status === 'draft'
                    ? [
                        {
                          key: 'start',
                          label: 'Mark in progress',
                          icon: <PlayCircle size={16} />,
                          onClick: () => void updateStatus(row, 'in_progress'),
                        },
                      ]
                    : []),
                  ...(row.status !== 'completed'
                    ? [
                        {
                          key: 'complete',
                          label: 'Mark completed',
                          icon: <CalendarCheck size={16} />,
                          onClick: () => void updateStatus(row, 'completed'),
                        },
                      ]
                    : []),
                  ...(row.status !== 'cancelled'
                    ? [
                        {
                          key: 'cancel',
                          label: 'Cancel exam',
                          icon: <CircleSlash size={16} />,
                          onClick: () => void updateStatus(row, 'cancelled'),
                        },
                      ]
                    : []),
                ]}
              />
            ),
          },
        ]}
        rows={list.rows as ExamRow[]}
        rowKey={(row) => row.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No exams scheduled yet."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Exams" value={stats.total} accent="blue" />
          <StatCard label="Scheduled" value={stats.scheduled} accent="gold" />
          <StatCard label="Completed" value={stats.completed} accent="green" />
          <StatCard label="Grades recorded" value={stats.graded} accent="purple" />
        </div>
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={open}
        title="Schedule Exam"
        onClose={() => setOpen(false)}
        maxWidth="xl"
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel="Schedule exam"
            submitting={saving}
            formId="exam-form"
          />
        }
      >
        <form id="exam-form" onSubmit={submit} className="space-y-4">
          <InputField
            label="Exam name"
            required
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Final Mathematics Exam"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Dropdown
              label="Exam type"
              required
              value={form.examType}
              onChange={(value) => setForm((prev) => ({ ...prev, examType: value }))}
              options={EXAM_TYPES}
            />
            <Dropdown
              label="Class"
              value={form.classId}
              onChange={(value) => setForm((prev) => ({ ...prev, classId: value }))}
              options={classes}
              placeholder="Not linked"
              clearable
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <InputField
              label="Subject"
              value={form.subject}
              onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
            />
            <InputField
              label="Date"
              required
              type="date"
              value={form.examDate}
              onChange={(e) => setForm((prev) => ({ ...prev, examDate: e.target.value }))}
            />
            <Dropdown
              label="Status"
              value={form.status}
              onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
              options={STATUS_OPTIONS}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <InputField
              label="Start time"
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
            />
            <InputField
              label="End time"
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
            />
            <InputField
              label="Total marks"
              type="number"
              min="1"
              value={form.totalMarks}
              onChange={(e) => setForm((prev) => ({ ...prev, totalMarks: e.target.value }))}
            />
            <InputField
              label="Passing marks"
              type="number"
              min="0"
              value={form.passingMarks}
              onChange={(e) => setForm((prev) => ({ ...prev, passingMarks: e.target.value }))}
            />
          </div>
          <TextAreaField
            label="Instructions"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Room arrangement, allowed materials, notes"
          />
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>
    </>
  );
}
