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
import { dateLabel } from '@/lib/display';

type PersonType = 'staff' | 'teacher';

type AttendanceRow = {
  id: string;
  personId: string | null;
  personType: PersonType;
  employeeName: string;
  employeeCode?: string | null;
  date?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  lateMinutes?: number;
  status: string;
  remarks?: string | null;
};

type EmployeeOption = {
  id: string;
  kind: PersonType;
  name: string;
  code: string | null;
  status: string;
};

type Summary = {
  todayPresent: number;
  todayLate: number;
  todayAbsent: number;
  todayMarked: number;
};

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'half_day', label: 'Half day' },
  { value: 'absent', label: 'Absent' },
  { value: 'excused', label: 'Excused' },
];

const STATUS_LABEL: Record<string, string> = {
  present: 'Present',
  late: 'Late',
  half_day: 'Half day',
  absent: 'Absent',
  excused: 'Excused',
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function timeLabel(value?: string | null) {
  return value ? value.slice(0, 5) : '—';
}

const blankForm = () => ({
  person: '',
  date: todayIso(),
  status: 'present',
  checkIn: '',
  checkOut: '',
  lateMinutes: '0',
  remarks: '',
});

type FormState = ReturnType<typeof blankForm>;

export default function HrAttendancePage() {
  const [items, setItems] = useState<AttendanceRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [personType, setPersonType] = useState('');
  const [dateRange, setDateRange] = useState({ from: daysAgoIso(30), to: todayIso() });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceRow | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<AttendanceRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    async (range: { from: string; to: string }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (range.from) params.set('from', range.from);
        if (range.to) params.set('to', range.to);
        const res = await fetch(`/api/hr/attendance?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load staff attendance');
        setItems(Array.isArray(data.rows) ? data.rows : []);
        setEmployees(Array.isArray(data.employees) ? data.employees : []);
        setSummary(data.summary ?? null);
        setError(null);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load staff attendance';
        setItems([]);
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void load(dateRange);
  }, [load, dateRange]);

  const filterFn = useCallback(
    (item: AttendanceRow) =>
      (!status || item.status === status) && (!personType || item.personType === personType),
    [status, personType]
  );

  const list = useListQuery({
    items: items as (AttendanceRow & Record<string, unknown>)[],
    searchKeys: ['employeeName', 'employeeCode', 'date', 'status', 'remarks'],
    filterKey: `${status}|${personType}`,
    filterFn: filterFn as (item: AttendanceRow & Record<string, unknown>) => boolean,
  });

  const statusOptions = STATUS_OPTIONS;

  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: `${employee.kind}:${employee.id}`,
        label: `${employee.name} · ${employee.kind === 'teacher' ? 'Teacher' : 'Staff'}${
          employee.code ? ` (${employee.code})` : ''
        }`,
      })),
    [employees]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...blankForm(), date: dateRange.to || todayIso() });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (row: AttendanceRow) => {
    setEditing(row);
    setForm({
      person: row.personId ? `${row.personType}:${row.personId}` : '',
      date: row.date ?? todayIso(),
      status: row.status,
      checkIn: row.checkIn ? row.checkIn.slice(0, 5) : '',
      checkOut: row.checkOut ? row.checkOut.slice(0, 5) : '',
      lateMinutes: String(row.lateMinutes ?? 0),
      remarks: row.remarks ?? '',
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const [kind, personId] = form.person.split(':');
    if (!kind || !personId) {
      setFormError('Choose an employee.');
      return;
    }
    if (!form.date) {
      setFormError('Choose the attendance date.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personType: kind,
          personId,
          date: form.date,
          status: form.status,
          checkIn: form.checkIn || null,
          checkOut: form.checkOut || null,
          lateMinutes: Number(form.lateMinutes) || 0,
          remarks: form.remarks || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save attendance');
      toast.success(data.updated ? 'Attendance updated.' : 'Attendance recorded.');
      setDialogOpen(false);
      setEditing(null);
      await load(dateRange);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save attendance';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      const res = await fetch(`/api/hr/attendance/${deleting.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete record');
      toast.success('Attendance record deleted.');
      setDeleting(null);
      await load(dateRange);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete record');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <ListPageShell
        title="Staff Attendance"
        description="Daily check-in and check-out records for employees and teachers"
        primaryAction={{ label: 'Mark attendance', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search employee, date, or remarks…"
        dateFrom={dateRange.from}
        dateTo={dateRange.to}
        onDateRangeChange={(next) =>
          setDateRange({ from: next.from, to: next.to })
        }
        onResetFilters={() => {
          list.reset();
          setStatus('');
          setPersonType('');
          setDateRange({ from: daysAgoIso(30), to: todayIso() });
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
            key: 'personType',
            label: 'Employee type',
            value: personType,
            options: [
              { value: 'staff', label: 'Non-teaching staff' },
              { value: 'teacher', label: 'Teaching staff' },
            ],
            onChange: setPersonType,
          },
        ]}
        loading={loading}
        columns={[
          {
            key: 'employeeName',
            header: 'Employee',
            render: (r) => (
              <div>
                <div className="font-semibold">{r.employeeName || '—'}</div>
                <div className="text-xs text-muted-foreground">
                  {[r.employeeCode, r.personType === 'teacher' ? 'Teacher' : 'Staff']
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
            ),
          },
          { key: 'date', header: 'Date', render: (r) => dateLabel(r.date) },
          { key: 'checkIn', header: 'Check in', render: (r) => timeLabel(r.checkIn) },
          { key: 'checkOut', header: 'Check out', render: (r) => timeLabel(r.checkOut) },
          {
            key: 'lateMinutes',
            header: 'Late (min)',
            align: 'right',
            render: (r) => Number(r.lateMinutes || 0),
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <StatusChip
                label={STATUS_LABEL[r.status] ?? r.status}
                tone={statusToneFromValue(r.status)}
              />
            ),
          },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (r) => (
              <RowActions
                onEdit={() => openEdit(r)}
                onDelete={() => setDeleting(r)}
              />
            ),
          },
        ]}
        rows={list.rows as AttendanceRow[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No staff attendance records for this period."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Present today" value={summary?.todayPresent ?? 0} accent="green" />
          <StatCard label="Late today" value={summary?.todayLate ?? 0} accent="gold" />
          <StatCard label="Absent today" value={summary?.todayAbsent ?? 0} accent="purple" />
          <StatCard label="Marked today" value={summary?.todayMarked ?? 0} accent="blue" />
        </div>
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={dialogOpen}
        title={editing ? 'Edit Attendance' : 'Mark Attendance'}
        onClose={() => {
          if (submitting) return;
          setDialogOpen(false);
          setEditing(null);
        }}
      >
        <form id="attendance-form" className="space-y-4" onSubmit={submit}>
          <Dropdown
            label="Employee"
            value={form.person}
            onChange={(value) => setForm((prev) => ({ ...prev, person: value }))}
            options={employeeOptions}
            placeholder="Select employee"
            disabled={Boolean(editing)}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              required
            />
            <Dropdown
              label="Status"
              value={form.status}
              onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
              options={STATUS_OPTIONS}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <InputField
              label="Check in"
              type="time"
              value={form.checkIn}
              onChange={(e) => setForm((prev) => ({ ...prev, checkIn: e.target.value }))}
            />
            <InputField
              label="Check out"
              type="time"
              value={form.checkOut}
              onChange={(e) => setForm((prev) => ({ ...prev, checkOut: e.target.value }))}
            />
            <InputField
              label="Late minutes"
              type="number"
              min="0"
              step="1"
              value={form.lateMinutes}
              onChange={(e) => setForm((prev) => ({ ...prev, lateMinutes: e.target.value }))}
              disabled={form.status !== 'late'}
            />
          </div>
          <TextAreaField
            label="Remarks"
            value={form.remarks}
            onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
            placeholder="Optional note"
          />
          <p className="text-xs text-muted-foreground">
            Saving the same employee and date again updates the existing record.
          </p>
          {formError && <ErrorBanner message={formError} />}
        </form>
        <FormDialogFooter
          onCancel={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
          submitLabel={editing ? 'Save changes' : 'Save attendance'}
          submitting={submitting}
          formId="attendance-form"
        />
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete attendance record"
        message={
          deleting
            ? `Delete the ${deleting.employeeName} record for ${dateLabel(deleting.date)}?`
            : ''
        }
        confirmLabel="Delete"
        submitting={busyId === deleting?.id}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
