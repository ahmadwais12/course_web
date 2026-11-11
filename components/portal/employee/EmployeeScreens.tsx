'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  Clock3,
  FileText,
  Mail,
  MessageSquare,
  Plus,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { StatusChip, statusToneFromValue } from '@/components/ports';
import StatCard from '@/components/ports/StatCard';
import DataTable, { type DataColumn } from '@/components/ports/DataTable';
import SectionPanel from '@/components/ports/SectionPanel';
import PageHeader from '@/components/ports/PageHeader';
import EmptyState from '@/components/ports/EmptyState';
import PortButton from '@/components/ports/PortButton';
import Dropdown from '@/components/ports/Dropdown';
import InputField, { TextAreaField } from '@/components/ports/InputField';
import FormDialog, { FormDialogFooter } from '@/components/ports/FormDialog';
import { toast } from '@/components/ui/Toast';
import { usePortalData } from '@/components/portal/PortalDataContext';
import type {
  PortalEmployeeData,
  PortalExpense,
  PortalLeave,
  PortalPayslip,
  PortalTimetableSlot,
} from '@/lib/portal-types';
import {
  DAY_NAMES,
  DAY_SHORT,
  InfoRow,
  PortalError,
  PortalLoading,
  ProgressBar,
  formatDate,
  formatMoney,
  formatMonth,
  formatTime,
  initials,
} from '@/components/portal/PortalUi';

const CURRENCY = 'AFN';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function todayDayNumber() {
  return ((new Date().getDay() + 6) % 7) + 1;
}

export function EmployeeGate({ children }: { children: (data: PortalEmployeeData) => React.ReactNode }) {
  const { data, loading, error, refresh } = usePortalData('employee');

  if (loading) return <PortalLoading />;
  if (error) return <PortalError message={error} onRetry={refresh} />;
  if (!data) return <PortalError message="No portal response was returned." onRetry={refresh} />;
  if (!data.employee) {
    return (
      <div className="p-1">
        <PageHeader title="Employee Portal" description="Your employee profile is not linked yet." />
        <EmptyState message="No staff or teacher record is linked to this account. Contact HR to complete your employment record." />
      </div>
    );
  }
  return <>{children(data)}</>;
}

function EmployeeAvatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/50" />;
  }
  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold text-white ring-2 ring-white/40">
      {initials(name)}
    </span>
  );
}

function AttendanceBars({ data }: { data: PortalEmployeeData }) {
  const months = data.attendance.monthly;
  if (!months.length) return <EmptyState message="No attendance recorded yet." />;
  const max = Math.max(1, ...months.map((month) => month.total));
  return (
    <div className="space-y-2">
      <div className="flex h-28 items-end justify-between gap-2">
        {[...months].reverse().map((month) => {
          const ratio = month.total ? month.present / month.total : 0;
          return (
            <div key={month.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div className="flex h-full w-full max-w-10 items-end overflow-hidden rounded-t-lg bg-muted">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-violet-600 to-violet-400"
                  style={{ height: `${Math.max(6, (month.total / max) * 100 * ratio)}%` }}
                  title={`${month.present} present of ${month.total}`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{formatMonth(month.month).split(' ')[0]}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{data.attendance.summary.present} present</span>
        <span>{data.attendance.summary.absent} absent</span>
        <span>{data.attendance.summary.late} late</span>
      </div>
    </div>
  );
}

export function EmployeeDashboardScreen() {
  return (
    <EmployeeGate>
      {(data) => {
        const employee = data.employee!;
        const latestPayslip = data.payslips[0] ?? null;
        const todaySlots = data.schedule.filter((slot) => Number(slot.dayOfWeek) === todayDayNumber());
        const pendingLeaves = data.leaves.filter((leave) => leave.status === 'pending');
        const pendingTasks = data.tasks.filter((task) => (task.status || 'pending') !== 'completed');

        return (
          <div className="space-y-4 p-1">
            <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 p-5 text-white shadow-card sm:p-6">
              <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex flex-wrap items-center gap-4">
                <EmployeeAvatar name={employee.fullName} url={employee.photoUrl} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Employee self-service</p>
                  <h1 className="truncate text-2xl font-bold leading-tight sm:text-3xl">{employee.fullName}</h1>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/80">
                    <span className="inline-flex items-center gap-1">
                      <Briefcase size={13} /> {employee.designation || employee.kind}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarCheck size={13} /> Joined {formatDate(employee.joinDate)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 size={13} /> {employee.status || 'active'}
                    </span>
                  </p>
                </div>
                <Link
                  href="/employee/leaves"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/25"
                >
                  Apply for leave
                </Link>
              </div>
              <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['Employee code', employee.employeeCode],
                  ['Department', employee.department || '—'],
                  ['Contract', employee.contractType || '—'],
                  ['Latest payslip', latestPayslip ? formatMonth(`${latestPayslip.year}-${String(latestPayslip.month).padStart(2, '0')}`) : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/65">{label}</p>
                    <p className="truncate text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </article>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
              <StatCard label="Attendance" value={`${data.attendance.summary.percentage}%`} hint="Recorded days" accent="purple" />
              <StatCard label="Leave taken" value={data.leaveBalance.takenDays} hint="Days this year" accent="green" />
              <StatCard label="Pending leave" value={pendingLeaves.length} hint="Awaiting approval" accent="gold" />
              <StatCard label="Net pay" value={latestPayslip ? formatMoney(latestPayslip.netSalary, CURRENCY) : '—'} hint="Latest payslip" accent="blue" />
              <StatCard label="Tasks" value={pendingTasks.length} hint="Open" accent="gold" />
              <StatCard label="Weekly slots" value={data.schedule.length} hint="Schedule" accent="purple" />
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <SectionPanel title="Attendance overview" headerRight={<Link href="/employee/attendance" className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-300">Details</Link>}>
                <AttendanceBars data={data} />
              </SectionPanel>

              <SectionPanel title="Today's schedule" description={DAY_NAMES[todayDayNumber() - 1]}>
                {todaySlots.length ? (
                  <ul className="space-y-2">
                    {todaySlots.map((slot: PortalTimetableSlot) => (
                      <li key={slot.id} className="rounded-xl border border-border bg-background px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">{slot.subjectName || 'Session'}</p>
                          <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                            {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {slot.className || 'Class'}
                          {slot.roomName ? ` · ${slot.roomName}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState message="No sessions scheduled for today." />
                )}
              </SectionPanel>

              <SectionPanel title="Leave requests" headerRight={<Link href="/employee/leaves" className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-300">All</Link>}>
                {data.leaves.length ? (
                  <ul className="divide-y divide-border">
                    {data.leaves.slice(0, 5).map((leave) => (
                      <li key={leave.id} className="flex items-center gap-2 py-2.5 first:pt-0 last:pb-0">
                        <CalendarOff size={15} className="shrink-0 text-violet-600 dark:text-violet-300" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold capitalize">{leave.leaveType.replaceAll('_', ' ')}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                          </p>
                        </div>
                        <StatusChip label={leave.status || 'pending'} tone={statusToneFromValue(leave.status || 'pending')} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState message="No leave requests submitted." />
                )}
              </SectionPanel>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <SectionPanel title="Payroll summary" headerRight={<Link href="/employee/payslips" className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-300">Payslips</Link>}>
                {latestPayslip ? (
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">
                        {MONTHS[latestPayslip.month - 1]} {latestPayslip.year}
                      </span>
                      <StatusChip label={latestPayslip.status || 'pending'} tone={statusToneFromValue(latestPayslip.status || 'pending')} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-muted/60 p-2.5">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Gross</p>
                        <p className="text-sm font-bold">{formatMoney(latestPayslip.grossSalary, CURRENCY)}</p>
                      </div>
                      <div className="rounded-xl bg-muted/60 p-2.5">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Net</p>
                        <p className="text-sm font-bold">{formatMoney(latestPayslip.netSalary, CURRENCY)}</p>
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Paid {formatDate(latestPayslip.paymentDate)}
                      {latestPayslip.payslipUrl && (
                        <>
                          {' · '}
                          <a href={latestPayslip.payslipUrl} target="_blank" rel="noreferrer" className="font-semibold text-violet-600 hover:underline dark:text-violet-300">
                            Download payslip
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <EmptyState message="No payslips have been issued yet." />
                )}
              </SectionPanel>

              <SectionPanel title="Assigned tasks">
                {data.tasks.length ? (
                  <ul className="divide-y divide-border">
                    {data.tasks.slice(0, 6).map((task) => (
                      <li key={task.id} className="flex items-center gap-2 py-2.5 first:pt-0 last:pb-0">
                        <Clock3 size={15} className="shrink-0 text-violet-600 dark:text-violet-300" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{task.title}</p>
                          {task.detail && <p className="truncate text-[11px] text-muted-foreground">{task.detail}</p>}
                        </div>
                        <StatusChip label={task.status || 'pending'} tone={statusToneFromValue(task.status || 'pending')} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState message="No tasks assigned." />
                )}
              </SectionPanel>
            </div>

            <SectionPanel title="Quick links">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { href: '/messaging', label: 'Messages', icon: MessageSquare },
                  { href: '/notifications', label: 'Notifications', icon: Mail },
                  { href: '/employee/documents', label: 'Documents', icon: FileText },
                  { href: '/employee/payslips', label: 'Payslips', icon: Wallet },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background px-2 py-4 text-center text-xs font-semibold text-foreground transition hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/40"
                  >
                    <link.icon size={18} className="text-violet-600 dark:text-violet-300" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </SectionPanel>
          </div>
        );
      }}
    </EmployeeGate>
  );
}

export function EmployeeProfileScreen() {
  return (
    <EmployeeGate>
      {(data) => {
        const employee = data.employee!;
        return (
          <div className="space-y-4 p-1">
            <PageHeader title="Employment Profile" description="Your employment record, department, and contact details." />
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionPanel title="Employment">
                <InfoRow label="Employee code" value={employee.employeeCode} />
                <InfoRow label="Full name" value={employee.fullName} />
                <InfoRow label="Type" value={employee.kind === 'teacher' ? 'Teaching staff' : 'Non-teaching staff'} />
                <InfoRow label="Department" value={employee.department} />
                <InfoRow label="Designation" value={employee.designation} />
                <InfoRow label="Join date" value={formatDate(employee.joinDate)} />
                <InfoRow label="Contract type" value={employee.contractType} />
                <InfoRow label="Contract end" value={formatDate(employee.contractEndDate)} />
                <InfoRow label="Status" value={<StatusChip label={employee.status || 'active'} tone={statusToneFromValue(employee.status || 'active')} />} />
              </SectionPanel>
              <SectionPanel title="Contact">
                <InfoRow label="Email" value={employee.email || data.profile.email} />
                <InfoRow label="Phone" value={employee.phone || data.profile.phone} />
                <InfoRow label="Address" value={employee.address} />
                <InfoRow label="Emergency contact" value={employee.emergencyContactName} />
                <InfoRow label="Emergency phone" value={employee.emergencyContactPhone} />
                {employee.kind === 'teacher' && (
                  <>
                    <InfoRow label="Qualification" value={employee.qualification} />
                    <InfoRow label="Specialization" value={employee.specialization} />
                  </>
                )}
              </SectionPanel>
            </div>
            <SectionPanel title="Payroll details" description="Used by HR when processing payroll.">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">Bank</p>
                  <p className="text-sm font-semibold">{employee.bankName || '—'}</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">Account</p>
                  <p className="text-sm font-semibold">{employee.bankAccountNumber || '—'}</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">Payslips</p>
                  <p className="text-sm font-semibold">{data.payslips.length}</p>
                </div>
              </div>
            </SectionPanel>
          </div>
        );
      }}
    </EmployeeGate>
  );
}

export function EmployeeAttendanceScreen() {
  return (
    <EmployeeGate>
      {(data) => {
        const columns: DataColumn<PortalEmployeeData['attendance']['recent'][number]>[] = [
          { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
          { key: 'status', header: 'Status', render: (row) => <StatusChip label={row.status || '—'} tone={statusToneFromValue(row.status || '')} /> },
          { key: 'in', header: 'Check in', render: (row) => formatTime(row.checkInTime) },
          { key: 'out', header: 'Check out', render: (row) => formatTime(row.checkOutTime) },
          { key: 'late', header: 'Late (min)', render: (row) => (row.lateMinutes ? row.lateMinutes : '—') },
          { key: 'remarks', header: 'Remarks', render: (row) => row.remarks || '—' },
        ];
        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="My Attendance"
              description="Attendance recorded for your employment. Check-in and check-out are captured by the HR attendance system."
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatCard label="Attendance" value={`${data.attendance.summary.percentage}%`} accent="purple" />
              <StatCard label="Present" value={data.attendance.summary.present} accent="green" />
              <StatCard label="Absent" value={data.attendance.summary.absent} accent="gold" />
              <StatCard label="Late" value={data.attendance.summary.late} accent="blue" />
              <StatCard label="Excused" value={data.attendance.summary.excused} accent="purple" />
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              <SectionPanel title="Monthly trend">
                <AttendanceBars data={data} />
              </SectionPanel>
              <SectionPanel title="Attendance history" className="xl:col-span-2">
                <DataTable columns={columns} rows={data.attendance.recent} rowKey={(row) => row.id} emptyMessage="No attendance records yet." />
              </SectionPanel>
            </div>
          </div>
        );
      }}
    </EmployeeGate>
  );
}

export function EmployeeLeavesScreen() {
  const { refresh } = usePortalData('employee');
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('full_day');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <EmployeeGate>
      {(data) => {
        const reset = () => {
          setOpen(false);
          setCategory('full_day');
          setStartDate('');
          setEndDate('');
          setReason('');
        };

        const apply = async () => {
          setSaving(true);
          try {
            const response = await fetch('/api/leaves', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                requesterType: 'employee',
                leave_type: category,
                start_date: startDate,
                end_date: endDate || startDate,
                reason,
              }),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body?.error || 'Leave request failed');
            toast.success('Leave request submitted', { description: 'Your manager will review it.' });
            reset();
            refresh();
          } catch (cause) {
            toast.error(cause instanceof Error ? cause.message : 'Leave request failed');
          } finally {
            setSaving(false);
          }
        };

        const columns: DataColumn<PortalLeave>[] = [
          { key: 'type', header: 'Type', render: (row) => <span className="capitalize">{row.leaveType.replaceAll('_', ' ')}</span> },
          { key: 'from', header: 'From', render: (row) => formatDate(row.startDate) },
          { key: 'to', header: 'To', render: (row) => formatDate(row.endDate) },
          { key: 'reason', header: 'Reason', render: (row) => <span className="block max-w-[260px] truncate" title={row.reason || ''}>{row.reason || '—'}</span> },
          { key: 'status', header: 'Status', render: (row) => <StatusChip label={row.status || 'pending'} tone={statusToneFromValue(row.status || 'pending')} /> },
          { key: 'approved', header: 'Reviewed', render: (row) => formatDate(row.approvedAt) },
          { key: 'note', header: 'Reviewer note', render: (row) => row.rejectionReason || '—' },
        ];
        const approvedDays = data.leaves
          .filter((leave) => leave.status === 'approved')
          .reduce((sum, leave) => {
            const from = Date.parse(leave.startDate);
            const to = Date.parse(leave.endDate || leave.startDate);
            return sum + (Number.isNaN(from) || Number.isNaN(to) ? 0 : Math.floor((to - from) / 86_400_000) + 1);
          }, 0);

        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Leave"
              description="Apply for leave and follow approval by your department manager."
              actions={
                <PortButton variant="primary" onClick={() => setOpen(true)}>
                  <Plus size={15} /> Apply for leave
                </PortButton>
              }
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Requests" value={data.leaves.length} accent="purple" />
              <StatCard label="Approved days" value={approvedDays} accent="green" />
              <StatCard label="Pending" value={data.leaves.filter((leave) => leave.status === 'pending').length} accent="gold" />
              <StatCard label="Rejected" value={data.leaves.filter((leave) => leave.status === 'rejected').length} accent="blue" />
            </div>
            <SectionPanel title="Leave requests">
              <DataTable columns={columns} rows={data.leaves} rowKey={(row) => row.id} emptyMessage="No leave requests submitted yet." />
            </SectionPanel>

            <FormDialog
              open={open}
              title="Apply for leave"
              onClose={reset}
              footer={
                <FormDialogFooter
                  onCancel={reset}
                  submitLabel="Submit request"
                  submitting={saving}
                  formId="employee-leave-form"
                  disabled={!startDate || !reason.trim()}
                />
              }
            >
              <form
                id="employee-leave-form"
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void apply();
                }}
              >
                <Dropdown
                  label="Leave category"
                  required
                  value={category}
                  onChange={setCategory}
                  options={[
                    { value: 'full_day', label: 'Full day' },
                    { value: 'half_day', label: 'Half day' },
                    { value: 'hourly', label: 'Hourly' },
                  ]}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <InputField label="Start date" type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                  <InputField label="End date" type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} />
                </div>
                <TextAreaField
                  label="Reason"
                  required
                  rows={4}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Explain the reason for your leave…"
                />
                <p className="text-xs text-muted-foreground">
                  Requests are routed to your department manager using the existing approval workflow.
                </p>
              </form>
            </FormDialog>
          </div>
        );
      }}
    </EmployeeGate>
  );
}

export function EmployeePayslipsScreen() {
  return (
    <EmployeeGate>
      {(data) => {
        const allowanceTotal = (payslip: PortalPayslip) =>
          Object.values(payslip.allowances ?? {}).reduce((sum, value) => sum + Number(value || 0), 0);
        const deductionTotal = (payslip: PortalPayslip) =>
          Object.values(payslip.deductions ?? {}).reduce((sum, value) => sum + Number(value || 0), 0);
        const latest = data.payslips[0] ?? null;

        const columns: DataColumn<PortalPayslip>[] = [
          {
            key: 'period',
            header: 'Period',
            render: (row) => (
              <div>
                <p className="font-semibold">{MONTHS[row.month - 1]} {row.year}</p>
                <p className="text-[11px] text-muted-foreground">{row.paymentMethod?.replaceAll('_', ' ') || '—'}</p>
              </div>
            ),
          },
          { key: 'basic', header: 'Basic', align: 'right', render: (row) => formatMoney(row.basicSalary, CURRENCY) },
          { key: 'allowances', header: 'Allowances', align: 'right', render: (row) => formatMoney(allowanceTotal(row), CURRENCY) },
          { key: 'deductions', header: 'Deductions', align: 'right', render: (row) => formatMoney(deductionTotal(row), CURRENCY) },
          { key: 'bonus', header: 'Bonus', align: 'right', render: (row) => formatMoney(row.bonus, CURRENCY) },
          { key: 'net', header: 'Net pay', align: 'right', render: (row) => <span className="font-semibold">{formatMoney(row.netSalary, CURRENCY)}</span> },
          { key: 'status', header: 'Status', render: (row) => <StatusChip label={row.status || 'pending'} tone={statusToneFromValue(row.status || 'pending')} /> },
          { key: 'paid', header: 'Paid on', render: (row) => formatDate(row.paymentDate) },
          {
            key: 'slip',
            header: 'Payslip',
            render: (row) =>
              row.payslipUrl ? (
                <a href={row.payslipUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-300">
                  Download
                </a>
              ) : (
                '—'
              ),
          },
        ];

        return (
          <div className="space-y-4 p-1">
            <PageHeader title="Payslips" description="Your salary history with allowances, deductions, and payment status." />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Payslips" value={data.payslips.length} accent="purple" />
              <StatCard label="Latest net" value={latest ? formatMoney(latest.netSalary, CURRENCY) : '—'} accent="green" />
              <StatCard label="Latest gross" value={latest ? formatMoney(latest.grossSalary, CURRENCY) : '—'} accent="blue" />
              <StatCard label="Paid" value={data.payslips.filter((slip) => slip.status === 'paid').length} accent="gold" />
            </div>
            <SectionPanel title="Salary history">
              <DataTable columns={columns} rows={data.payslips} rowKey={(row) => row.id} emptyMessage="No payslips have been issued yet." />
            </SectionPanel>
            {latest && (
              <SectionPanel title="Latest payslip breakdown" description={`${MONTHS[latest.month - 1]} ${latest.year}`}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">Allowances</p>
                    {Object.keys(latest.allowances ?? {}).length ? (
                      <ul className="mt-1 space-y-0.5 text-xs">
                        {Object.entries(latest.allowances).map(([key, value]) => (
                          <li key={key} className="flex justify-between gap-2">
                            <span className="capitalize text-muted-foreground">{key.replaceAll('_', ' ')}</span>
                            <span className="font-semibold">{formatMoney(Number(value), CURRENCY)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">None</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">Deductions</p>
                    {Object.keys(latest.deductions ?? {}).length ? (
                      <ul className="mt-1 space-y-0.5 text-xs">
                        {Object.entries(latest.deductions).map(([key, value]) => (
                          <li key={key} className="flex justify-between gap-2">
                            <span className="capitalize text-muted-foreground">{key.replaceAll('_', ' ')}</span>
                            <span className="font-semibold">{formatMoney(Number(value), CURRENCY)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">None</p>
                    )}
                  </div>
                  <div className="rounded-xl bg-muted/60 p-3">
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">Net pay</p>
                    <p className="mt-1 text-lg font-bold">{formatMoney(latest.netSalary, CURRENCY)}</p>
                    <p className="text-[11px] text-muted-foreground">Overtime {formatMoney(latest.overtimePay, CURRENCY)}</p>
                  </div>
                </div>
              </SectionPanel>
            )}
          </div>
        );
      }}
    </EmployeeGate>
  );
}

export function EmployeeDocumentsScreen() {
  return (
    <EmployeeGate>
      {(data) => (
        <div className="space-y-4 p-1">
          <PageHeader title="My Documents" description="Employment contracts, certificates, and HR documents." />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Documents" value={data.documents.length} accent="purple" />
            <StatCard label="Verified" value={data.documents.filter((doc) => doc.isVerified).length} accent="green" />
            <StatCard label="Employee code" value={data.employee?.employeeCode || '—'} accent="blue" />
            <StatCard label="Department" value={data.employee?.department || '—'} accent="gold" />
          </div>
          <SectionPanel title="Document library">
            {data.documents.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.documents.map((doc) => (
                  <article key={doc.id} className="flex flex-col rounded-xl border border-border bg-background p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200">
                        <Receipt size={18} />
                      </span>
                      <StatusChip label={doc.isVerified ? 'verified' : 'unverified'} tone={doc.isVerified ? 'green' : 'gold'} />
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold capitalize">{doc.title}</p>
                    <p className="text-[11px] capitalize text-muted-foreground">{doc.documentType?.replaceAll('_', ' ') || 'Document'}</p>
                    <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                      {doc.issueDate && <p>Issued {formatDate(doc.issueDate)}</p>}
                      {doc.expiryDate && <p>Expires {formatDate(doc.expiryDate)}</p>}
                      {doc.issuedBy && <p>By {doc.issuedBy}</p>}
                    </div>
                    <a href={doc.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:underline dark:text-violet-300">
                      Open document <ArrowUpRight size={13} />
                    </a>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState message="No HR documents have been shared with your account yet." />
            )}
          </SectionPanel>
          <SectionPanel title="Need an HR document?" description="Requests are handled by the HR department.">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Mail size={15} />
              Contact HR through
              <Link href="/messaging" className="font-semibold text-violet-600 hover:underline dark:text-violet-300">
                Messages
              </Link>
              for employment letters or certificates.
            </div>
          </SectionPanel>
        </div>
      )}
    </EmployeeGate>
  );
}

export function EmployeeTasksScreen() {
  return (
    <EmployeeGate>
      {(data) => {
        const today = todayDayNumber();
        const open = data.tasks.filter((task) => (task.status || 'pending') !== 'completed');
        const completed = data.tasks.filter((task) => task.status === 'completed');
        const todaySlots = data.schedule.filter((slot) => Number(slot.dayOfWeek) === today);

        const columns: DataColumn<(typeof data.tasks)[number]>[] = [
          {
            key: 'task',
            header: 'Task',
            render: (row) => (
              <div className="min-w-[220px]">
                <p className="font-semibold">{row.title}</p>
                <p className="text-[11px] text-muted-foreground">{row.detail || '—'}</p>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusChip
                label={row.status || 'pending'}
                tone={statusToneFromValue(row.status || 'pending')}
              />
            ),
          },
        ];

        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Tasks & Schedule"
              description="Work assigned to you and your weekly timetable."
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Open tasks" value={open.length} accent="gold" />
              <StatCard label="Completed" value={completed.length} accent="green" />
              <StatCard label="Today's sessions" value={todaySlots.length} hint={DAY_NAMES[today - 1]} accent="blue" />
              <StatCard label="Weekly slots" value={data.schedule.length} accent="purple" />
            </div>

            <SectionPanel title="Assigned tasks">
              <DataTable
                columns={columns}
                rows={data.tasks}
                rowKey={(row) => row.id}
                emptyMessage="No tasks have been assigned to you."
              />
            </SectionPanel>

            <SectionPanel title="Weekly schedule" description="Sessions linked to your teaching or staff assignment.">
              {data.schedule.length ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 7 }, (_, index) => index + 1).map((day) => {
                    const slots = data.schedule
                      .filter((slot) => Number(slot.dayOfWeek) === day)
                      .sort((a, b) => a.startTime.localeCompare(b.startTime));
                    return (
                      <div
                        key={day}
                        className={`rounded-xl border p-3 ${
                          day === today ? 'border-violet-300 bg-violet-50/60 dark:border-violet-800 dark:bg-violet-950/30' : 'border-border'
                        }`}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {DAY_NAMES[day - 1]}
                        </p>
                        {slots.length ? (
                          <ul className="mt-2 space-y-2">
                            {slots.map((slot) => (
                              <li key={slot.id} className="rounded-lg bg-background px-2.5 py-2 ring-1 ring-border">
                                <p className="truncate text-xs font-semibold">{slot.subjectName || 'Session'}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {slot.className || '—'}
                                  {slot.roomName ? ` · ${slot.roomName}` : ''}
                                </p>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-[11px] text-muted-foreground">No sessions</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState message="No timetable slots have been published for you." />
              )}
            </SectionPanel>
          </div>
        );
      }}
    </EmployeeGate>
  );
}

const EXPENSE_CATEGORIES = [
  { value: 'travel', label: 'Travel' },
  { value: 'transport', label: 'Transport' },
  { value: 'supplies', label: 'Office supplies' },
  { value: 'meals', label: 'Meals' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'training', label: 'Training' },
  { value: 'other', label: 'Other' },
];

export function EmployeeExpensesScreen() {
  const { refresh } = usePortalData('employee');
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('travel');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendor, setVendor] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <EmployeeGate>
      {(data) => {
        const reset = () => {
          setOpen(false);
          setCategory('travel');
          setAmount('');
          setExpenseDate(new Date().toISOString().slice(0, 10));
          setVendor('');
          setDescription('');
        };

        const submit = async () => {
          setSaving(true);
          try {
            const response = await fetch('/api/portal/employee/expenses', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                category,
                amount: Number(amount),
                expenseDate,
                vendor,
                description,
              }),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body?.error || 'Expense claim failed');
            toast.success('Expense claim submitted', { description: 'Finance will review your claim.' });
            reset();
            refresh();
          } catch (cause) {
            toast.error(cause instanceof Error ? cause.message : 'Expense claim failed');
          } finally {
            setSaving(false);
          }
        };

        const total = data.expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const approved = data.expenses
          .filter((row) => row.status === 'approved' || row.status === 'paid')
          .reduce((sum, row) => sum + Number(row.amount || 0), 0);

        const columns: DataColumn<PortalExpense>[] = [
          { key: 'date', header: 'Date', render: (row) => formatDate(row.expenseDate) },
          {
            key: 'category',
            header: 'Category',
            render: (row) => (
              <div>
                <p className="font-semibold capitalize">{row.category?.replaceAll('_', ' ') || 'Expense'}</p>
                {row.subcategory && <p className="text-[11px] capitalize text-muted-foreground">{row.subcategory.replaceAll('_', ' ')}</p>}
              </div>
            ),
          },
          { key: 'vendor', header: 'Vendor', render: (row) => row.vendor || '—' },
          {
            key: 'description',
            header: 'Description',
            render: (row) => (
              <span className="block max-w-[240px] truncate" title={row.description || row.notes || ''}>
                {row.description || row.notes || '—'}
              </span>
            ),
          },
          { key: 'amount', header: 'Amount', align: 'right', render: (row) => <span className="font-semibold">{formatMoney(Number(row.amount || 0), CURRENCY)}</span> },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusChip label={row.status || 'pending'} tone={statusToneFromValue(row.status || 'pending')} />,
          },
        ];

        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Expense Claims"
              description="Submit reimbursable expenses and follow their approval."
              actions={
                <PortButton variant="primary" onClick={() => setOpen(true)}>
                  <Plus size={15} /> New claim
                </PortButton>
              }
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Claims" value={data.expenses.length} accent="purple" />
              <StatCard label="Claimed" value={formatMoney(total, CURRENCY)} accent="blue" />
              <StatCard label="Approved" value={formatMoney(approved, CURRENCY)} accent="green" />
              <StatCard label="Pending" value={data.expenses.filter((row) => (row.status || 'pending') === 'pending').length} accent="gold" />
            </div>
            <SectionPanel title="Your claims">
              <DataTable
                columns={columns}
                rows={data.expenses}
                rowKey={(row) => row.id}
                emptyMessage="You have not submitted any expense claims yet."
              />
            </SectionPanel>

            <FormDialog
              open={open}
              title="Submit expense claim"
              onClose={reset}
              footer={
                <FormDialogFooter
                  onCancel={reset}
                  submitLabel="Submit claim"
                  submitting={saving}
                  formId="employee-expense-form"
                  disabled={!amount || Number(amount) <= 0 || !expenseDate}
                />
              }
            >
              <form
                id="employee-expense-form"
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Dropdown
                    label="Category"
                    required
                    value={category}
                    onChange={setCategory}
                    options={EXPENSE_CATEGORIES}
                  />
                  <InputField
                    label="Amount (AFN)"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                  <InputField
                    label="Expense date"
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(event) => setExpenseDate(event.target.value)}
                  />
                  <InputField
                    label="Vendor"
                    value={vendor}
                    onChange={(event) => setVendor(event.target.value)}
                    placeholder="Where the expense was paid"
                  />
                </div>
                <TextAreaField
                  label="Description"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe the business purpose of this expense…"
                />
                <p className="text-xs text-muted-foreground">
                  Claims are routed to finance for review. Attach receipts through HR if requested.
                </p>
              </form>
            </FormDialog>
          </div>
        );
      }}
    </EmployeeGate>
  );
}

export function EmployeePerformanceScreen() {
  return (
    <EmployeeGate>
      {(data) => {
        const performance = data.performance;
        const rating = performance.rating;
        const ratingPercent = rating == null ? 0 : Math.min(100, (rating / 5) * 100);
        const approvedLeave = data.leaves.filter((leave) => leave.status === 'approved');
        const rejectedLeave = data.leaves.filter((leave) => leave.status === 'rejected');

        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Performance"
              description="Your appraisal rating, attendance, and review schedule."
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Rating" value={rating == null ? '—' : `${rating.toFixed(1)}/5`} accent="green" />
              <StatCard label="Attendance" value={`${performance.attendancePercentage}%`} accent="blue" />
              <StatCard label="Leave days" value={performance.leaveDaysTaken} hint="Approved this year" accent="gold" />
              <StatCard label="Open tasks" value={performance.openTasks} accent="purple" />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <SectionPanel title="Appraisal summary">
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold">Overall rating</span>
                      <span className="text-muted-foreground">{rating == null ? 'Not evaluated' : `${rating.toFixed(1)} of 5`}</span>
                    </div>
                    <ProgressBar value={ratingPercent} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <InfoRow label="Last evaluation" value={formatDate(performance.lastEvaluationDate) || '—'} />
                    <InfoRow label="Next evaluation" value={formatDate(performance.nextEvaluationDate) || '—'} />
                    <InfoRow label="Employee code" value={data.employee?.employeeCode || '—'} />
                    <InfoRow label="Department" value={data.employee?.department || '—'} />
                  </div>
                  <p className="flex items-start gap-2 rounded-xl bg-muted/60 p-2.5 text-[11px] text-muted-foreground">
                    <TrendingUp size={14} className="mt-0.5 shrink-0 text-violet-600 dark:text-violet-300" />
                    Ratings and review dates are maintained by HR. Contact your manager if an evaluation is missing.
                  </p>
                </div>
              </SectionPanel>

              <SectionPanel title="Attendance record">
                <AttendanceBars data={data} />
              </SectionPanel>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <SectionPanel title="Leave usage">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Approved requests</span>
                    <span className="font-semibold">{approvedLeave.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Days taken</span>
                    <span className="font-semibold">{data.leaveBalance.takenDays}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pending days</span>
                    <span className="font-semibold">{data.leaveBalance.pendingDays}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Rejected requests</span>
                    <span className="font-semibold">{rejectedLeave.length}</span>
                  </div>
                </div>
              </SectionPanel>

              <SectionPanel title="Workload">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Assigned tasks</span>
                    <span className="font-semibold">{data.tasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Open tasks</span>
                    <span className="font-semibold">{performance.openTasks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Weekly sessions</span>
                    <span className="font-semibold">{data.schedule.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Expense claims</span>
                    <span className="font-semibold">{data.expenses.length}</span>
                  </div>
                </div>
              </SectionPanel>

              <SectionPanel title="Quick links">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { href: '/employee/tasks', label: 'Tasks', icon: CalendarDays },
                    { href: '/employee/attendance', label: 'Attendance', icon: CalendarCheck },
                    { href: '/employee/expenses', label: 'Expenses', icon: Wallet },
                    { href: '/employee/leaves', label: 'Leave', icon: CalendarOff },
                  ].map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background px-2 py-3 text-center text-[11px] font-semibold transition hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/40"
                    >
                      <link.icon size={16} className="text-violet-600 dark:text-violet-300" />
                      {link.label}
                    </Link>
                  ))}
                </div>
              </SectionPanel>
            </div>
          </div>
        );
      }}
    </EmployeeGate>
  );
}
