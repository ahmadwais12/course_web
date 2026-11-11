'use client';

import React, { useMemo, useState } from 'react';
import { CalendarDays, Clock3, LogIn, LogOut, Plus, Timer } from 'lucide-react';
import {
  DataTable,
  Dropdown,
  EmptyState,
  FormDialog,
  FormDialogFooter,
  InputField,
  PageHeader,
  PortButton,
  SectionPanel,
  StatCard,
  StatusChip,
  TextAreaField,
  statusToneFromValue,
  type DataColumn,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { usePortalData } from '@/components/portal/PortalDataContext';
import { usePortalExtras } from '@/components/portal/usePortalExtras';
import {
  PortalError,
  PortalLoading,
  ProgressBar,
  formatDate,
  formatTime,
  groupByDay,
} from '@/components/portal/PortalUi';
import { EmployeeGate } from '@/components/portal/employee/EmployeeScreens';
import type {
  PortalEmployeeExtras,
  PortalHoliday,
  PortalSupportTicket,
  PortalTimetableSlot,
} from '@/lib/portal-types';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function minutesBetween(start: string | null, end: string | null) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some((value) => Number.isNaN(value))) return 0;
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

function formatHours(minutes: number) {
  if (!minutes) return '—';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${String(rest).padStart(2, '0')}m`;
}

function ExtrasLoading({ error, refresh }: { error: string | null; refresh: () => void }) {
  if (error) return <PortalError message={error} onRetry={refresh} />;
  return <PortalLoading />;
}

export function EmployeeCheckInScreen() {
  const { refresh } = usePortalData('employee');
  const [pending, setPending] = useState<'check_in' | 'check_out' | null>(null);

  return (
    <EmployeeGate>
      {(data) => {
        const today = todayIso();
        const todayRow = data.attendance.recent.find((row) => row.date === today) ?? null;
        const checkedIn = Boolean(todayRow?.checkInTime);
        const checkedOut = Boolean(todayRow?.checkOutTime);

        const act = async (action: 'check_in' | 'check_out') => {
          setPending(action);
          try {
            const response = await fetch('/api/portal/employee/checkin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action }),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body?.error || 'Attendance could not be recorded');
            toast.success(action === 'check_in' ? 'Checked in' : 'Checked out', {
              description:
                action === 'check_in'
                  ? `Check-in recorded at ${formatTime(body.checkInTime)}`
                  : `Check-out recorded at ${formatTime(body.checkOutTime)}`,
            });
            refresh();
          } catch (cause) {
            toast.error(cause instanceof Error ? cause.message : 'Attendance could not be recorded');
          } finally {
            setPending(null);
          }
        };

        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Check In / Check Out"
              description="Record your daily attendance from the portal."
            />
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today</p>
                    <p className="mt-1 text-lg font-bold">{formatDate(today)}</p>
                    <p className="text-xs text-muted-foreground">
                      {checkedIn ? `Checked in at ${formatTime(todayRow?.checkInTime)}` : 'Not checked in yet'}
                      {checkedOut ? ` · checked out at ${formatTime(todayRow?.checkOutTime)}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <PortButton
                      variant="primary"
                      disabled={checkedIn || pending !== null}
                      onClick={() => void act('check_in')}
                    >
                      <LogIn size={15} /> {pending === 'check_in' ? 'Checking in…' : 'Check in'}
                    </PortButton>
                    <PortButton
                      disabled={!checkedIn || checkedOut || pending !== null}
                      onClick={() => void act('check_out')}
                    >
                      <LogOut size={15} /> {pending === 'check_out' ? 'Checking out…' : 'Check out'}
                    </PortButton>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard label="Present days" value={data.attendance.summary.present} accent="green" />
                  <StatCard label="Late days" value={data.attendance.summary.late} accent="gold" />
                  <StatCard label="Absent days" value={data.attendance.summary.absent} accent="purple" />
                  <StatCard label="Attendance" value={`${data.attendance.summary.percentage}%`} accent="blue" />
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                <p className="mt-2 text-sm font-semibold">
                  {checkedOut ? 'Day complete' : checkedIn ? 'Currently working' : 'Awaiting check-in'}
                </p>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <p className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5"><Clock3 size={13} /> Check in</span>
                    <span className="font-semibold text-foreground">{formatTime(todayRow?.checkInTime)}</span>
                  </p>
                  <p className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5"><Clock3 size={13} /> Check out</span>
                    <span className="font-semibold text-foreground">{formatTime(todayRow?.checkOutTime)}</span>
                  </p>
                  <p className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5"><Timer size={13} /> Worked</span>
                    <span className="font-semibold text-foreground">
                      {formatHours(minutesBetween(todayRow?.checkInTime ?? null, todayRow?.checkOutTime ?? null))}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <SectionPanel title="Recent attendance">
              {data.attendance.recent.length ? (
                <div className="space-y-2">
                  {data.attendance.recent.slice(0, 10).map((row) => (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3.5 py-2.5 text-sm"
                    >
                      <span className="font-semibold">{formatDate(row.date)}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(row.checkInTime)} – {formatTime(row.checkOutTime)}
                      </span>
                      <StatusChip label={row.status || '—'} tone={statusToneFromValue(row.status || '')} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No attendance has been recorded yet." />
              )}
            </SectionPanel>
          </div>
        );
      }}
    </EmployeeGate>
  );
}

export function EmployeeHoursScreen() {
  const { data, loading, error, refresh } = usePortalData('employee');

  const rows = useMemo(
    () =>
      (data?.attendance.recent ?? []).map((row) => ({
        ...row,
        workedMinutes: minutesBetween(row.checkInTime, row.checkOutTime),
      })),
    [data]
  );

  const total = rows.reduce((sum, row) => sum + row.workedMinutes, 0);
  const completed = rows.filter((row) => row.workedMinutes > 0).length;
  const average = completed ? Math.round(total / completed) : 0;
  const longest = rows.reduce((best, row) => Math.max(best, row.workedMinutes), 0);

  const columns: DataColumn<(typeof rows)[number]>[] = [
    { key: 'date', header: 'Date', render: (row) => <span className="font-semibold">{formatDate(row.date)}</span> },
    { key: 'in', header: 'Check in', render: (row) => formatTime(row.checkInTime) },
    { key: 'out', header: 'Check out', render: (row) => formatTime(row.checkOutTime) },
    { key: 'worked', header: 'Worked', align: 'right', render: (row) => formatHours(row.workedMinutes) },
    { key: 'over', header: 'Overtime', align: 'right', render: (row) => (row.workedMinutes > 480 ? formatHours(row.workedMinutes - 480) : '—') },
    { key: 'status', header: 'Status', render: (row) => <StatusChip label={row.status || '—'} tone={statusToneFromValue(row.status || '')} /> },
  ];

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="Working Hours"
        description="Hours calculated from your recorded check-in and check-out times."
      />
      {loading || error ? (
        <ExtrasLoading error={error} refresh={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total hours" value={formatHours(total)} accent="green" />
            <StatCard label="Average day" value={formatHours(average)} accent="blue" />
            <StatCard label="Longest day" value={formatHours(longest)} accent="gold" />
            <StatCard label="Days recorded" value={rows.length} accent="purple" />
          </div>
          <SectionPanel title="Daily hours">
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              emptyMessage="No check-in records are available yet."
            />
          </SectionPanel>
        </>
      )}
    </div>
  );
}

export function EmployeeHolidaysScreen() {
  const { data, loading, error, refresh } = usePortalExtras<PortalEmployeeExtras>('employee');
  const today = todayIso();
  const holidays = data?.holidays ?? [];
  const upcoming = holidays.filter((row) => row.date >= today);
  const past = holidays.filter((row) => row.date < today);

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="Holidays"
        description="School holidays and public holidays published for your workplace."
      />
      {loading || error ? (
        <ExtrasLoading error={error} refresh={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Upcoming" value={upcoming.length} accent="green" />
            <StatCard label="Total holidays" value={holidays.length} accent="blue" />
            <StatCard label="Next holiday" value={upcoming[0] ? formatDate(upcoming[0].date) : '—'} accent="gold" />
            <StatCard label="Recurring" value={holidays.filter((row) => row.isRecurring).length} accent="purple" />
          </div>
          <SectionPanel title="Upcoming holidays">
            {upcoming.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {upcoming.map((row) => (
                  <HolidayCard key={row.id} row={row} />
                ))}
              </div>
            ) : (
              <EmptyState message="No upcoming holidays are published." />
            )}
          </SectionPanel>
          {past.length ? (
            <SectionPanel title="Past holidays">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {past.slice().reverse().map((row) => (
                  <HolidayCard key={row.id} row={row} muted />
                ))}
              </div>
            </SectionPanel>
          ) : null}
        </>
      )}
    </div>
  );
}

function HolidayCard({ row, muted = false }: { row: PortalHoliday; muted?: boolean }) {
  return (
    <article className={`rounded-2xl border border-border p-4 ${muted ? 'bg-muted/40' : 'bg-card'}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">
          <CalendarDays size={18} />
        </span>
        {row.isRecurring ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Recurring
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm font-semibold">{row.name}</p>
      <p className="text-[11px] font-medium text-muted-foreground">{formatDate(row.date)}</p>
      {row.description ? (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{row.description}</p>
      ) : null}
    </article>
  );
}

export function EmployeeShiftsScreen() {
  const { data, loading, error, refresh } = usePortalData('employee');
  const extras = usePortalExtras<PortalEmployeeExtras>('employee');

  const grouped = useMemo(() => groupByDay<PortalTimetableSlot>(data?.schedule ?? []), [data]);
  const scheduledDays = grouped.filter((day) => day.slots.length > 0);
  const weeklyMinutes = (data?.schedule ?? []).reduce((sum, slot) => sum + minutesBetween(slot.startTime, slot.endTime), 0);

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="My Shift"
        description="Your assigned shift, contract details, and weekly schedule."
      />
      {loading || error ? (
        <ExtrasLoading error={error} refresh={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Shift" value={extras.data?.shift.shiftType || 'Not set'} accent="green" />
            <StatCard label="Contract" value={extras.data?.shift.contractType || '—'} accent="blue" />
            <StatCard label="Scheduled days" value={scheduledDays.length} accent="purple" />
            <StatCard label="Weekly hours" value={formatHours(weeklyMinutes)} accent="gold" />
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Employment</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Employee</dt>
                  <dd className="font-semibold">{data?.employee?.fullName || '—'}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Employee code</dt>
                  <dd className="font-semibold">{data?.employee?.employeeCode || '—'}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Department</dt>
                  <dd className="font-semibold">{data?.employee?.department || '—'}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Join date</dt>
                  <dd className="font-semibold">{formatDate(extras.data?.shift.joinDate ?? data?.employee?.joinDate)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Contract end</dt>
                  <dd className="font-semibold">{formatDate(extras.data?.shift.contractEndDate ?? data?.employee?.contractEndDate)}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Weekly schedule</p>
              {scheduledDays.length ? (
                <div className="mt-3 space-y-3">
                  {scheduledDays.map((day) => (
                    <div key={day.day}>
                      <p className="text-xs font-semibold">{day.name}</p>
                      <div className="mt-1 space-y-1.5">
                        {day.slots.map((slot) => (
                          <div
                            key={slot.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-xs"
                          >
                            <span className="font-semibold">
                              {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                            </span>
                            <span className="text-muted-foreground">
                              {[slot.subjectName, slot.className, slot.roomName].filter(Boolean).join(' · ') || 'Duty'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No schedule slots are assigned. Contact HR if you expect a weekly timetable.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const REQUEST_CATEGORIES = [
  { value: 'access', label: 'Access request' },
  { value: 'account', label: 'Account issue' },
  { value: 'hardware', label: 'Equipment' },
  { value: 'software', label: 'Software' },
  { value: 'network', label: 'Network' },
  { value: 'other', label: 'Other' },
];
const REQUEST_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function EmployeeRequestsScreen() {
  const { data, loading, error, refresh } = usePortalExtras<PortalEmployeeExtras>('employee');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [category, setCategory] = useState('other');
  const [priority, setPriority] = useState('medium');
  const [saving, setSaving] = useState(false);

  const requests = data?.requests ?? [];

  const reset = () => {
    setOpen(false);
    setTitle('');
    setDetails('');
    setCategory('other');
    setPriority('medium');
  };

  const submit = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/portal/employee/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: details, category, priority }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Request could not be submitted');
      toast.success('Request submitted');
      reset();
      refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Request could not be submitted');
    } finally {
      setSaving(false);
    }
  };

  const columns: DataColumn<PortalSupportTicket>[] = [
    {
      key: 'title',
      header: 'Request',
      render: (row) => (
        <div className="min-w-[200px]">
          <p className="font-semibold">{row.title}</p>
          <p className="line-clamp-1 text-[11px] text-muted-foreground">{row.description || '—'}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (row) => row.category || '—' },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => <StatusChip label={row.priority || 'medium'} tone={statusToneFromValue(row.priority || 'medium')} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusChip label={row.status || 'open'} tone={statusToneFromValue(row.status || 'open')} />,
    },
    { key: 'created', header: 'Submitted', render: (row) => formatDate(row.createdAt) },
    { key: 'resolved', header: 'Resolved', render: (row) => formatDate(row.resolvedAt) },
  ];

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="HR Requests"
        description="Raise HR and workplace requests and follow up on their status."
        actions={
          <PortButton variant="primary" onClick={() => setOpen(true)}>
            <Plus size={15} /> New request
          </PortButton>
        }
      />
      {loading || error ? (
        <ExtrasLoading error={error} refresh={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Requests" value={requests.length} accent="green" />
            <StatCard label="Open" value={requests.filter((row) => row.status === 'open').length} accent="gold" />
            <StatCard label="In progress" value={requests.filter((row) => row.status === 'in_progress').length} accent="blue" />
            <StatCard label="Resolved" value={requests.filter((row) => row.status === 'resolved' || row.status === 'closed').length} accent="purple" />
          </div>
          <SectionPanel title="My requests">
            <DataTable columns={columns} rows={requests} rowKey={(row) => row.id} emptyMessage="No HR requests have been submitted." />
          </SectionPanel>
        </>
      )}

      <FormDialog
        open={open}
        title="New HR request"
        onClose={reset}
        footer={
          <FormDialogFooter
            onCancel={reset}
            submitLabel="Submit request"
            submitting={saving}
            formId="employee-request-form"
            disabled={!title.trim() || !details.trim()}
          />
        }
      >
        <form
          id="employee-request-form"
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <InputField
            label="Subject"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Access to the staff portal"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Dropdown label="Category" value={category} onChange={setCategory} options={REQUEST_CATEGORIES} />
            <Dropdown label="Priority" value={priority} onChange={setPriority} options={REQUEST_PRIORITIES} />
          </div>
          <TextAreaField
            label="Details"
            required
            rows={4}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Describe what you need and why…"
          />
        </form>
      </FormDialog>
    </div>
  );
}

export function EmployeeScheduleScreen() {
  const { data, loading, error, refresh } = usePortalData('employee');
  const grouped = useMemo(() => groupByDay<PortalTimetableSlot>(data?.schedule ?? []), [data]);
  const totalMinutes = (data?.schedule ?? []).reduce((sum, slot) => sum + minutesBetween(slot.startTime, slot.endTime), 0);

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="My Schedule"
        description="Your weekly timetable and teaching or duty slots."
      />
      {loading || error ? (
        <ExtrasLoading error={error} refresh={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Slots" value={data?.schedule.length ?? 0} accent="green" />
            <StatCard label="Active days" value={grouped.filter((day) => day.slots.length).length} accent="blue" />
            <StatCard label="Weekly hours" value={formatHours(totalMinutes)} accent="gold" />
            <StatCard label="Subjects" value={new Set((data?.schedule ?? []).map((slot) => slot.subjectName).filter(Boolean)).size} accent="purple" />
          </div>
          <SectionPanel title="Weekly timetable">
            {data?.schedule.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {grouped.map((day) => (
                  <div key={day.day} className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day.name}</p>
                    {day.slots.length ? (
                      <div className="mt-2 space-y-2">
                        {day.slots.map((slot) => (
                          <div key={slot.id} className="rounded-xl border border-border px-3 py-2 text-xs">
                            <p className="font-semibold">
                              {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                            </p>
                            <p className="text-muted-foreground">
                              {[slot.subjectName, slot.className, slot.roomName].filter(Boolean).join(' · ') || 'Duty'}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">No slots</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No schedule has been assigned to you." />
            )}
          </SectionPanel>
          <SectionPanel title="Hours per day">
            <div className="space-y-2.5">
              {grouped.map((day) => {
                const minutes = day.slots.reduce((sum, slot) => sum + minutesBetween(slot.startTime, slot.endTime), 0);
                const percent = totalMinutes ? Math.round((minutes / totalMinutes) * 100) : 0;
                return (
                  <div key={day.day} className="flex items-center gap-3">
                    <span className="w-10 text-xs font-semibold text-muted-foreground">{day.short}</span>
                    <div className="flex-1">
                      <ProgressBar value={percent} />
                    </div>
                    <span className="w-16 text-right text-xs font-semibold">{formatHours(minutes)}</span>
                  </div>
                );
              })}
            </div>
          </SectionPanel>
        </>
      )}
    </div>
  );
}
