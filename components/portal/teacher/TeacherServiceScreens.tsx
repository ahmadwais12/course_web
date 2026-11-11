'use client';

import React from 'react';
import { CalendarDays, Target, TrendingUp } from 'lucide-react';
import {
  DataTable,
  PageHeader,
  SectionPanel,
  StatCard,
  StatusChip,
  statusToneFromValue,
  type DataColumn,
} from '@/components/ports';
import { PortalError, PortalLoading, ProgressBar, formatDate } from '@/components/portal/PortalUi';
import { usePortalEndpoint } from '@/components/portal/usePortalEndpoint';
import type {
  PortalTeacherLeaveRequest,
  PortalTeacherWorkload,
  PortalTeacherWorkloadClass,
} from '@/lib/portal-types';

function leaveDays(start: string, end: string | null) {
  const from = Date.parse(start);
  const to = Date.parse(end || start);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(1, Math.floor((to - from) / 86_400_000) + 1);
}

export function TeacherWorkloadScreen() {
  const { data, loading, error, refresh } = usePortalEndpoint<PortalTeacherWorkload>(
    '/api/portal/teacher/workload'
  );

  const classes: PortalTeacherWorkloadClass[] = data?.classes ?? [];
  const percentage = data?.percentage ?? 0;

  const columns: DataColumn<PortalTeacherWorkloadClass>[] = [
    {
      key: 'class',
      header: 'Class',
      render: (row) => (
        <div className="min-w-[160px]">
          <p className="font-semibold">{row.className}</p>
          <p className="text-[11px] text-muted-foreground">{row.subjects} subject assignments</p>
        </div>
      ),
    },
    { key: 'students', header: 'Students', align: 'right', render: (row) => row.students },
    { key: 'slots', header: 'Weekly slots', align: 'right', render: (row) => row.weeklySlots },
    { key: 'assignments', header: 'Assignments', align: 'right', render: (row) => row.assignments },
    { key: 'exams', header: 'Exams', align: 'right', render: (row) => row.exams },
    {
      key: 'attendance',
      header: 'Attendance',
      align: 'right',
      render: (row) => (
        <span
          className={
            row.attendanceAverage >= 85
              ? 'font-semibold text-emerald-600 dark:text-emerald-300'
              : row.attendanceAverage >= 70
                ? 'font-semibold text-amber-600 dark:text-amber-300'
                : 'font-semibold text-rose-600 dark:text-rose-300'
          }
        >
          {row.attendanceAverage}%
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="Teaching Workload"
        description="Your assigned hours, utilisation, and the load carried by each class."
      />
      {loading || error ? (
        error ? <PortalError message={error} onRetry={refresh} /> : <PortalLoading />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Assigned hours" value={data?.workloadHours ?? 0} accent="blue" />
            <StatCard label="Maximum hours" value={data?.maxWorkloadHours ?? 0} accent="purple" />
            <StatCard label="Utilisation" value={`${percentage}%`} accent="green" />
            <StatCard label="Classes" value={classes.length} accent="gold" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SectionPanel title="Workload summary" className="lg:col-span-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {data?.workloadHours ?? 0} of {data?.maxWorkloadHours ?? 0} hours
                  </span>
                  <span className="font-semibold">{percentage}%</span>
                </div>
                <ProgressBar
                  value={percentage}
                  tone={
                    percentage > 100
                      ? 'bg-rose-500'
                      : percentage >= 85
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }
                />
                <div className="grid gap-3 pt-2 sm:grid-cols-3">
                  <div className="rounded-xl bg-muted/60 p-3">
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">Courses</p>
                    <p className="text-lg font-bold">{data?.totalCourses ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-muted/60 p-3">
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">Classes</p>
                    <p className="text-lg font-bold">{data?.totalClasses ?? classes.length}</p>
                  </div>
                  <div className="rounded-xl bg-muted/60 p-3">
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">Employee code</p>
                    <p className="text-lg font-bold">{data?.employeeCode || '—'}</p>
                  </div>
                </div>
              </div>
            </SectionPanel>

            <SectionPanel title="Load guidance">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <TrendingUp size={15} /> Under 85% — balanced workload.
                </p>
                <p className="flex items-center gap-2">
                  <Target size={15} /> 85–100% — near capacity.
                </p>
                <p className="flex items-center gap-2">
                  <CalendarDays size={15} /> Above 100% — coordinate with the academic office.
                </p>
              </div>
            </SectionPanel>
          </div>

          <SectionPanel
            title="Class load"
            description="Students, weekly timetable slots, assignments, and exams per class."
          >
            <DataTable
              columns={columns}
              rows={classes}
              rowKey={(row) => row.classId}
              emptyMessage="No classes are assigned to you yet."
            />
          </SectionPanel>
        </>
      )}
    </div>
  );
}

export function TeacherLeaveRequestsScreen() {
  const { data, loading, error, refresh } = usePortalEndpoint<{ requests: PortalTeacherLeaveRequest[] }>(
    '/api/portal/teacher/leaves'
  );

  const requests = data?.requests ?? [];
  const pending = requests.filter((row) => (row.status || 'pending') === 'pending');
  const approved = requests.filter((row) => row.status === 'approved').length;
  const rejected = requests.filter((row) => row.status === 'rejected').length;
  const pendingDays = pending.reduce((sum, row) => sum + leaveDays(row.startDate, row.endDate), 0);

  const columns: DataColumn<PortalTeacherLeaveRequest>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (row) => (
        <div className="min-w-[150px]">
          <p className="font-semibold">{row.studentName}</p>
          <p className="text-[11px] text-muted-foreground">{row.studentCode || '—'}</p>
        </div>
      ),
    },
    { key: 'class', header: 'Class', render: (row) => row.className || '—' },
    {
      key: 'period',
      header: 'Leave period',
      render: (row) => {
        const days = leaveDays(row.startDate, row.endDate);
        return (
          <div className="min-w-[160px]">
            <p className="font-semibold">
              {formatDate(row.startDate)}
              {row.endDate && row.endDate !== row.startDate ? ` – ${formatDate(row.endDate)}` : ''}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {days} day{days === 1 ? '' : 's'}
            </p>
          </div>
        );
      },
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => (
        <span className="block max-w-[240px] truncate" title={row.reason || ''}>
          {row.reason || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <StatusChip label={row.status || 'pending'} tone={statusToneFromValue(row.status || 'pending')} />
      ),
    },
    { key: 'approved', header: 'Approved', render: (row) => formatDate(row.approvedAt) },
    {
      key: 'note',
      header: 'Office note',
      render: (row) => (
        <span className="block max-w-[200px] truncate" title={row.note || ''}>
          {row.note || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="Student Leave Requests"
        description="Leave requested by students in your classes, with the academic office decision."
      />
      {loading || error ? (
        error ? <PortalError message={error} onRetry={refresh} /> : <PortalLoading />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Requests" value={requests.length} accent="blue" />
            <StatCard label="Pending" value={pending.length} accent="gold" />
            <StatCard label="Approved" value={approved} accent="green" />
            <StatCard label="Rejected" value={rejected} accent="purple" />
          </div>

          <SectionPanel
            title="Class leave requests"
            description={
              pending.length
                ? `${pending.length} request${pending.length === 1 ? '' : 's'} covering ${pendingDays} day${pendingDays === 1 ? '' : 's'} awaiting a decision.`
                : 'No requests are awaiting a decision.'
            }
          >
            <DataTable
              columns={columns}
              rows={requests}
              rowKey={(row) => row.id}
              emptyMessage="No leave requests have been recorded for your students."
            />
          </SectionPanel>

          <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            Decisions are recorded by the academic office. Contact them through Messages if a
            request needs to be reviewed urgently.
          </p>
        </>
      )}
    </div>
  );
}
