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
  statusToneFromValue,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { dateLabel, money } from '@/lib/display';

type EmployeeKind = 'staff' | 'teacher';

type StaffRow = {
  id: string;
  recordId: string;
  kind: EmployeeKind;
  name: string;
  code: string | null;
  role: string;
  designation: string | null;
  department: string | null;
  departmentId: string | null;
  email: string | null;
  phone: string | null;
  salary: number;
  status: string;
  joinDate: string | null;
  contractType: string;
  specialization: string | null;
};

type Summary = {
  total: number;
  active: number;
  teachers: number;
  staff: number;
  monthlySalary: number;
};

type Department = { id: string; name: string };

const KIND_LABEL: Record<EmployeeKind, string> = {
  staff: 'Non-teaching',
  teacher: 'Teaching',
};

const CONTRACT_TYPES = [
  { value: 'full-time', label: 'Full time' },
  { value: 'part-time', label: 'Part time' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On leave' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'terminated', label: 'Terminated' },
];

const blankForm = () => ({
  kind: 'staff' as EmployeeKind,
  fullName: '',
  employeeCode: '',
  email: '',
  phone: '',
  designation: '',
  department: '',
  departmentId: '',
  specialization: '',
  salary: '',
  joinDate: '',
  contractType: 'contract',
  status: 'active',
});

type FormState = ReturnType<typeof blankForm>;

export default function HrStaffPage() {
  const [items, setItems] = useState<StaffRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');
  const [department, setDepartment] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<StaffRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/staff');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load staff');
      setItems(Array.isArray(data.rows) ? data.rows : []);
      setDepartments(Array.isArray(data.departments) ? data.departments : []);
      setSummary(data.summary ?? null);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load staff';
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

  const openEdit = (row: StaffRow) => {
    setEditing(row);
    setForm({
      kind: row.kind,
      fullName: row.name,
      employeeCode: row.code ?? '',
      email: row.email ?? '',
      phone: row.phone ?? '',
      designation: row.kind === 'staff' ? row.designation ?? '' : '',
      department: row.kind === 'staff' ? row.department ?? '' : '',
      departmentId: row.kind === 'teacher' ? row.departmentId ?? '' : '',
      specialization: row.specialization ?? '',
      salary: String(row.salary || ''),
      joinDate: row.joinDate ?? '',
      contractType: row.contractType.toLowerCase().replaceAll('_', '-'),
      status: row.status,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.fullName.trim()) {
      setFormError('Enter the employee name.');
      return;
    }

    const payload = {
      kind: form.kind,
      fullName: form.fullName,
      employeeCode: form.employeeCode || null,
      email: form.email || null,
      phone: form.phone || null,
      designation: form.kind === 'staff' ? form.designation || null : undefined,
      department: form.kind === 'staff' ? form.department || null : undefined,
      specialization: form.kind === 'teacher' ? form.specialization || null : undefined,
      departmentId: form.kind === 'teacher' ? form.departmentId || null : undefined,
      salary: Number(form.salary) || 0,
      joinDate: form.joinDate || null,
      contractType: form.contractType,
      status: form.status,
    };

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(
        editing ? `/api/hr/staff/${editing.recordId}?kind=${editing.kind}` : '/api/hr/staff',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save employee');
      toast.success(editing ? 'Employee updated.' : 'Employee added.');
      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save employee';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/hr/staff/${deleting.recordId}?kind=${deleting.kind}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete employee');
      toast.success('Employee removed.');
      setDeleting(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete employee');
    } finally {
      setSubmitting(false);
    }
  };

  const filterFn = useCallback(
    (item: StaffRow) =>
      (!status || item.status === status) &&
      (!kind || item.kind === kind) &&
      (!department || item.department === department),
    [status, kind, department]
  );

  const list = useListQuery({
    items: items as (StaffRow & Record<string, unknown>)[],
    searchKeys: ['name', 'code', 'role', 'email', 'department'],
    filterKey: `${status}|${kind}|${department}`,
    filterFn: filterFn as (item: StaffRow & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(() => {
    const set = new Set(items.map((item) => item.status).filter(Boolean));
    return [...set].map((value) => ({
      value,
      label: STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value.replaceAll('_', ' '),
    }));
  }, [items]);

  const departmentOptions = useMemo(() => {
    const set = new Set(items.map((item) => item.department).filter(Boolean) as string[]);
    return [...set].sort().map((value) => ({ value, label: value }));
  }, [items]);

  const departmentSelectOptions = useMemo(
    () => departments.map((row) => ({ value: row.id, label: row.name })),
    [departments]
  );

  return (
    <>
      <ListPageShell
        title="Staff Directory"
        description="Employees and teachers with roles, departments, and salaries"
        primaryAction={{ label: 'Add employee', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search name, role, code, or email…"
        onResetFilters={() => {
          list.reset();
          setStatus('');
          setKind('');
          setDepartment('');
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
            key: 'kind',
            label: 'Employee type',
            value: kind,
            options: [
              { value: 'teacher', label: 'Teaching' },
              { value: 'staff', label: 'Non-teaching' },
            ],
            onChange: setKind,
          },
          {
            key: 'department',
            label: 'Department',
            value: department,
            options: departmentOptions,
            onChange: setDepartment,
          },
        ]}
        loading={loading}
        columns={[
          {
            key: 'name',
            header: 'Employee',
            render: (r) => (
              <div>
                <div className="font-semibold">{r.name}</div>
                <div className="text-xs text-muted-foreground">
                  {[r.code, r.email].filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
            ),
          },
          {
            key: 'role',
            header: 'Role',
            render: (r) => (
              <div>
                <div>{r.role}</div>
                <div className="text-[11px] text-muted-foreground">{KIND_LABEL[r.kind]}</div>
              </div>
            ),
          },
          { key: 'department', header: 'Department', render: (r) => r.department || '—' },
          {
            key: 'salary',
            header: 'Salary',
            align: 'right',
            render: (r) => money(r.salary),
          },
          { key: 'joinDate', header: 'Joined', render: (r) => dateLabel(r.joinDate) },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <StatusChip label={r.status.replaceAll('_', ' ')} tone={statusToneFromValue(r.status)} />
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
        rows={list.rows as StaffRow[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No staff records yet."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Employees" value={summary?.total ?? 0} accent="blue" />
          <StatCard label="Active" value={summary?.active ?? 0} accent="green" />
          <StatCard
            label="Teaching / non-teaching"
            value={`${summary?.teachers ?? 0} / ${summary?.staff ?? 0}`}
            accent="purple"
          />
          <StatCard label="Monthly salary bill" value={money(summary?.monthlySalary ?? 0)} accent="gold" />
        </div>
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={dialogOpen}
        title={editing ? 'Edit Employee' : 'New Employee'}
        onClose={() => {
          if (submitting) return;
          setDialogOpen(false);
          setEditing(null);
        }}
        maxWidth="2xl"
      >
        <form id="employee-form" className="space-y-4" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Dropdown
              label="Employee type"
              value={form.kind}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, kind: value === 'teacher' ? 'teacher' : 'staff' }))
              }
              options={[
                { value: 'staff', label: 'Non-teaching staff' },
                { value: 'teacher', label: 'Teacher' },
              ]}
              disabled={Boolean(editing)}
              required
            />
            <InputField
              label="Full name"
              value={form.fullName}
              onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Employee code"
              value={form.employeeCode}
              onChange={(e) => setForm((prev) => ({ ...prev, employeeCode: e.target.value }))}
              hint={editing ? undefined : 'Leave blank to generate one automatically.'}
            />
            <InputField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
            {form.kind === 'staff' ? (
              <InputField
                label="Designation"
                value={form.designation}
                onChange={(e) => setForm((prev) => ({ ...prev, designation: e.target.value }))}
                placeholder="e.g. Accountant"
              />
            ) : (
              <InputField
                label="Specialization"
                value={form.specialization}
                onChange={(e) => setForm((prev) => ({ ...prev, specialization: e.target.value }))}
                placeholder="e.g. Mathematics"
              />
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {form.kind === 'staff' ? (
              <InputField
                label="Department"
                value={form.department}
                onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                placeholder="e.g. Finance"
              />
            ) : (
              <Dropdown
                label="Department"
                value={form.departmentId}
                onChange={(value) => setForm((prev) => ({ ...prev, departmentId: value }))}
                options={departmentSelectOptions}
                placeholder="Select department"
                clearable
              />
            )}
            <InputField
              label="Monthly salary"
              type="number"
              min="0"
              step="0.01"
              value={form.salary}
              onChange={(e) => setForm((prev) => ({ ...prev, salary: e.target.value }))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Join date"
              type="date"
              value={form.joinDate}
              onChange={(e) => setForm((prev) => ({ ...prev, joinDate: e.target.value }))}
            />
            <Dropdown
              label="Contract type"
              value={form.contractType}
              onChange={(value) => setForm((prev) => ({ ...prev, contractType: value }))}
              options={CONTRACT_TYPES}
              required
            />
          </div>

          <Dropdown
            label="Employment status"
            value={form.status}
            onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
            options={STATUS_OPTIONS}
            required
          />

          <p className="text-xs text-muted-foreground">
            Employee records appear in payroll, attendance, and the contracts register. Portal login
            accounts are linked separately.
          </p>
          {formError && <ErrorBanner message={formError} />}
        </form>
        <FormDialogFooter
          onCancel={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
          submitLabel={editing ? 'Save changes' : 'Add employee'}
          submitting={submitting}
          formId="employee-form"
        />
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove employee"
        message={
          deleting
            ? `Remove ${deleting.name} from the staff directory? Records linked to this employee may block deletion.`
            : ''
        }
        confirmLabel="Remove"
        submitting={submitting}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
