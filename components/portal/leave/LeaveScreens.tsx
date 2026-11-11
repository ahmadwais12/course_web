'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, CheckCircle2, ClipboardCheck, Plus, XCircle } from 'lucide-react';
import {
  DataTable,
  Dropdown,
  EmptyState,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
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
import { PortalError, PortalLoading, formatDate } from '@/components/portal/PortalUi';
import { useListQuery } from '@/hooks/useListQuery';
import type {
  PortalLeaveData,
  PortalLeaveRequest,
  PortalHoliday,
} from '@/lib/portal-types';

type RequestRow = PortalLeaveRequest & Record<string, unknown>;

type QueueItem = {
  id: string;
  requester_type: 'student' | 'employee';
  requester_id: string;
  requester_name: string;
  requester_code: string | null;
  context: string | null;
  leave_type: string;
  start_date: string | null;
  end_date: string | null;
  reason: string | null;
  status: string;
  rejection_reason: string | null;
  approver_name: string | null;
  can_approve: boolean;
  created_at: string | null;
};

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function leaveDays(start: string | null, end: string | null) {
  if (!start) return 0;
  const from = Date.parse(start);
  const to = Date.parse(end || start);
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return 0;
  return Math.floor((to - from) / 86_400_000) + 1;
}

function categoryLabel(value: string | null | undefined) {
  if (!value) return 'Leave';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Shared leave identity + holiday context for every Leave portal page. */
export function LeaveGate({ children }: { children: (data: PortalLeaveData) => React.ReactNode }) {
  const { data, loading, error, refresh } = usePortalData('leave');

  if (loading) return <PortalLoading />;
  if (error) return <PortalError message={error} onRetry={refresh} />;
  if (!data) return <PortalError message="No portal response was returned." onRetry={refresh} />;
  if (!data.person && !data.canApprove) {
    return (
      <div className="p-1">
        <PageHeader
          title="Leave Portal"
          description="Leave requests are available once your student or employee record is linked."
        />
        <EmptyState message="No student or employee record is linked to this account. Contact the academic office or HR to complete your profile." />
      </div>
    );
  }
  return <>{children(data)}</>;
}

export function LeaveDashboardScreen() {
  const router = useRouter();

  return (
    <LeaveGate>
      {(data) => {
        const upcoming = data.holidays.filter(
          (holiday) => holiday.date >= todayInput()
        );
        const nextHoliday = upcoming[0] ?? null;

        const columns: DataColumn<PortalLeaveRequest>[] = [
          {
            key: 'period',
            header: 'Period',
            render: (row) => (
              <div>
                <p className="font-semibold">
                  {formatDate(row.startDate)}
                  {row.endDate && row.endDate !== row.startDate
                    ? ` – ${formatDate(row.endDate)}`
                    : ''}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {row.days} day{row.days === 1 ? '' : 's'}
                </p>
              </div>
            ),
          },
          {
            key: 'type',
            header: 'Type',
            render: (row) => (
              <div>
                <p>{row.leaveType}</p>
                <p className="text-[11px] capitalize text-muted-foreground">
                  {row.kind === 'student' ? 'Student leave' : categoryLabel(row.category)}
                </p>
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
          { key: 'created', header: 'Submitted', render: (row) => formatDate(row.createdAt) },
        ];

        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Leave Portal"
              description={
                data.person
                  ? `Leave requests for ${data.person.name ?? 'you'}${
                      data.person.context ? ` · ${data.person.context}` : ''
                    }`
                  : 'Review leave requests waiting for your approval.'
              }
              actions={
                data.person ? (
                  <PortButton variant="primary" onClick={() => router.push('/leave/requests')}>
                    <Plus size={15} /> Request leave
                  </PortButton>
                ) : undefined
              }
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Pending" value={data.summary.pending} accent="gold" hint="Awaiting review" />
              <StatCard label="Approved" value={data.summary.approved} accent="green" hint="All time" />
              <StatCard
                label="Approved days"
                value={data.summary.approvedDays}
                accent="blue"
                hint={String(new Date().getFullYear())}
              />
              <StatCard
                label="Upcoming holidays"
                value={upcoming.length}
                accent="purple"
                hint={nextHoliday ? nextHoliday.name : 'None scheduled'}
              />
            </div>

            {data.canApprove && (
              <SectionPanel
                title="Approvals"
                description="Review leave requests routed to you as class teacher or department manager."
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                      <ClipboardCheck size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Approval queue</p>
                      <p className="text-xs text-muted-foreground">
                        Approve or reject pending requests from your class or department.
                      </p>
                    </div>
                  </div>
                  <PortButton variant="secondary" onClick={() => router.push('/leave/approvals')}>
                    Open approvals
                  </PortButton>
                </div>
              </SectionPanel>
            )}

            <div className="grid gap-4 xl:grid-cols-3">
              <SectionPanel
                title="Recent requests"
                description="Your latest leave activity."
                className="xl:col-span-2"
              >
                <DataTable
                  columns={columns}
                  rows={data.requests.slice(0, 6)}
                  rowKey={(row) => row.id}
                  emptyMessage="You have not requested any leave yet."
                />
              </SectionPanel>

              <SectionPanel title="Upcoming holidays">
                {upcoming.length === 0 ? (
                  <p className="rounded-xl bg-muted/60 px-3 py-6 text-center text-sm text-muted-foreground">
                    No upcoming holidays published.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {upcoming.slice(0, 5).map((holiday) => (
                      <li
                        key={holiday.id}
                        className="flex items-start gap-3 rounded-xl border border-border px-3 py-2"
                      >
                        <CalendarDays size={16} className="mt-0.5 shrink-0 text-amber-600" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {holiday.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDate(holiday.date)}
                            {holiday.isRecurring ? ' · recurring' : ''}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionPanel>
            </div>
          </div>
        );
      }}
    </LeaveGate>
  );
}

export function LeaveRequestsScreen() {
  const { refresh } = usePortalData('leave');
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('full_day');
  const [startDate, setStartDate] = useState(todayInput());
  const [endDate, setEndDate] = useState(todayInput());
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [scope, setScope] = useState('');

  const reset = () => {
    setOpen(false);
    setCategory('full_day');
    setStartDate(todayInput());
    setEndDate(todayInput());
    setReason('');
  };

  return (
    <LeaveGate>
      {(data) => {
        const submit = async () => {
          setSaving(true);
          try {
            const response = await fetch('/api/portal/leave', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                startDate,
                endDate,
                category,
                reason,
              }),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body?.error || 'Leave request could not be submitted');
            toast.success('Leave request submitted', {
              description:
                typeof body?.routed_to === 'string'
                  ? `Routed to your ${body.routed_to}.`
                  : 'Your request is awaiting review.',
            });
            reset();
            refresh();
          } catch (cause) {
            toast.error(
              cause instanceof Error ? cause.message : 'Leave request could not be submitted'
            );
          } finally {
            setSaving(false);
          }
        };

        return (
          <LeaveRequestsList
            data={data}
            open={open}
            setOpen={setOpen}
            reset={reset}
            submit={submit}
            saving={saving}
            category={category}
            setCategory={setCategory}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            reason={reason}
            setReason={setReason}
            status={status}
            setStatus={setStatus}
            type={type}
            setType={setType}
            scope={scope}
            setScope={setScope}
          />
        );
      }}
    </LeaveGate>
  );
}

function LeaveRequestsList({
  data,
  open,
  setOpen,
  reset,
  submit,
  saving,
  category,
  setCategory,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  reason,
  setReason,
  status,
  setStatus,
  type,
  setType,
  scope,
  setScope,
}: {
  data: PortalLeaveData;
  open: boolean;
  setOpen: (value: boolean) => void;
  reset: () => void;
  submit: () => void;
  saving: boolean;
  category: string;
  setCategory: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  reason: string;
  setReason: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  type: string;
  setType: (value: string) => void;
  scope: string;
  setScope: (value: string) => void;
}) {
  const filterFn = useCallback(
    (row: RequestRow) =>
      (!status || (row.status ?? 'pending') === status) &&
      (!type || row.category === type) &&
      (!scope || row.kind === scope),
    [status, type, scope]
  );

  const list = useListQuery<RequestRow>({
    items: data.requests as RequestRow[],
    searchKeys: ['leaveType', 'reason', 'status'],
    filterKey: `${status}|${type}|${scope}`,
    filterFn,
  });

  const typeOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];
    for (const row of data.requests) {
      if (!row.category || seen.has(row.category)) continue;
      seen.add(row.category);
      options.push({ value: row.category, label: categoryLabel(row.category) });
    }
    return options;
  }, [data.requests]);

  const columns: DataColumn<PortalLeaveRequest>[] = [
    {
      key: 'period',
      header: 'Period',
      render: (row) => (
        <div>
          <p className="font-semibold">
            {formatDate(row.startDate)}
            {row.endDate && row.endDate !== row.startDate ? ` – ${formatDate(row.endDate)}` : ''}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {row.days} day{row.days === 1 ? '' : 's'} · {row.kind === 'student' ? 'Student' : 'Employee'}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <div>
          <p>{row.leaveType}</p>
          <p className="text-[11px] capitalize text-muted-foreground">
            {categoryLabel(row.category)}
          </p>
        </div>
      ),
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
        <StatusChip
          label={row.status || 'pending'}
          tone={statusToneFromValue(row.status || 'pending')}
        />
      ),
    },
    { key: 'approved', header: 'Reviewed', render: (row) => formatDate(row.approvedAt) },
    {
      key: 'note',
      header: 'Reviewer note',
      render: (row) => (
        <span className="block max-w-[200px] truncate" title={row.rejectionReason || ''}>
          {row.rejectionReason || '—'}
        </span>
      ),
    },
  ];

  return (
    <>
      <ListPageShell
        title="My Leave Requests"
        description="Submit leave and follow the approval decision."
        primaryAction={
          data.person ? { label: 'Request leave', onClick: () => setOpen(true) } : undefined
        }
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search type, reason, status…"
        onResetFilters={() => {
          list.reset();
          setStatus('');
          setType('');
          setScope('');
        }}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: status,
            options: [
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'cancelled', label: 'Cancelled' },
            ],
            onChange: setStatus,
          },
          {
            key: 'type',
            label: 'Category',
            value: type,
            options: typeOptions,
            onChange: setType,
          },
          {
            key: 'scope',
            label: 'Requester',
            value: scope,
            options: [
              { value: 'student', label: 'Student' },
              { value: 'employee', label: 'Employee' },
            ],
            onChange: setScope,
          },
        ]}
        loading={false}
        columns={columns}
        rows={list.rows}
        rowKey={(row) => row.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No leave requests match your filters."
      />

      <FormDialog
        open={open}
        title="Request leave"
        onClose={reset}
        footer={
          <FormDialogFooter
            onCancel={reset}
            submitLabel="Submit request"
            submitting={saving}
            formId="leave-portal-form"
            disabled={!startDate || !endDate || !reason.trim()}
          />
        }
      >
        <form
          id="leave-portal-form"
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          {data.kind === 'employee' && (
            <Dropdown
              label="Leave category"
              required
              value={category}
              onChange={setCategory}
              options={
                data.leaveTypes.length
                  ? data.leaveTypes
                  : [
                      { value: 'full_day', label: 'Full day' },
                      { value: 'half_day', label: 'Half day' },
                      { value: 'hourly', label: 'Hourly' },
                    ]
              }
            />
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="From"
              type="date"
              required
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <InputField
              label="To"
              type="date"
              required
              value={endDate}
              min={startDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
          <TextAreaField
            label="Reason"
            required
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain why you need leave (medical, family, travel…)"
          />
          <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            {data.kind === 'student'
              ? 'Your request is routed to your class teacher for review.'
              : 'Your request is routed to your department manager for review.'}
          </p>
        </form>
      </FormDialog>
    </>
  );
}

export function LeaveApprovalsScreen() {
  const { data, refresh } = usePortalData('leave');
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [rejecting, setRejecting] = useState<QueueItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/leaves', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
        return Array.isArray(body?.items) ? (body.items as QueueItem[]) : [];
      })
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Failed to load approvals');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const pending = useMemo(
    () => items.filter((item) => item.can_approve && (item.status ?? 'pending') === 'pending'),
    [items]
  );
  const reviewed = useMemo(
    () => items.filter((item) => item.can_approve && (item.status ?? 'pending') !== 'pending').slice(0, 10),
    [items]
  );

  const review = async (item: QueueItem, action: 'approve' | 'reject') => {
    setBusyId(item.id);
    try {
      const response = await fetch('/api/leaves', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          requesterType: item.requester_type,
          action,
          rejection_reason: action === 'reject' ? rejectReason : undefined,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Leave request could not be reviewed');
      toast.success(action === 'approve' ? 'Leave approved' : 'Leave rejected');
      setRejecting(null);
      setRejectReason('');
      setReloadToken((value) => value + 1);
      refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Leave request could not be reviewed');
    } finally {
      setBusyId(null);
    }
  };

  const columns: DataColumn<QueueItem>[] = [
    {
      key: 'requester',
      header: 'Requester',
      render: (row) => (
        <div>
          <p className="font-semibold">{row.requester_name}</p>
          <p className="text-[11px] text-muted-foreground">
            {row.requester_code || '—'}
            {row.context ? ` · ${row.context}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <div>
          <p>{row.leave_type}</p>
          <p className="text-[11px] capitalize text-muted-foreground">
            {row.requester_type === 'student' ? 'Student' : 'Employee'}
          </p>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      render: (row) => {
        const days = leaveDays(row.start_date, row.end_date);
        return (
          <div>
            <p className="font-semibold">
              {formatDate(row.start_date)}
              {row.end_date && row.end_date !== row.start_date ? ` – ${formatDate(row.end_date)}` : ''}
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
        <span className="block max-w-[220px] truncate" title={row.reason || ''}>
          {row.reason || '—'}
        </span>
      ),
    },
    { key: 'submitted', header: 'Submitted', render: (row) => formatDate(row.created_at) },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <PortButton
            variant="primary"
            className="h-8 px-3 text-xs"
            disabled={busyId === row.id}
            onClick={() => void review(row, 'approve')}
          >
            <CheckCircle2 size={14} /> Approve
          </PortButton>
          <PortButton
            variant="danger"
            className="h-8 px-3 text-xs"
            disabled={busyId === row.id}
            onClick={() => {
              setRejecting(row);
              setRejectReason('');
            }}
          >
            <XCircle size={14} /> Reject
          </PortButton>
        </div>
      ),
    },
  ];

  const historyColumns: DataColumn<QueueItem>[] = [
    {
      key: 'requester',
      header: 'Requester',
      render: (row) => (
        <div>
          <p className="font-semibold">{row.requester_name}</p>
          <p className="text-[11px] text-muted-foreground">{row.requester_code || '—'}</p>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      render: (row) => (
        <span>
          {formatDate(row.start_date)}
          {row.end_date && row.end_date !== row.start_date ? ` – ${formatDate(row.end_date)}` : ''}
        </span>
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
    {
      key: 'note',
      header: 'Reviewer note',
      render: (row) => (
        <span className="block max-w-[200px] truncate" title={row.rejection_reason || ''}>
          {row.rejection_reason || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="Leave Approvals"
        description="Requests from your students or department awaiting your decision."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Awaiting review" value={pending.length} accent="gold" />
        <StatCard label="Reviewed" value={reviewed.length} accent="green" />
        <StatCard
          label="Student requests"
          value={pending.filter((item) => item.requester_type === 'student').length}
          accent="blue"
        />
        <StatCard
          label="Employee requests"
          value={pending.filter((item) => item.requester_type === 'employee').length}
          accent="purple"
        />
      </div>

      {!data?.canApprove && !loading && (
        <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          You are not an approver. Requests you submit appear under My Requests.
        </p>
      )}

      {error && <PortalError message={error} onRetry={() => setReloadToken((value) => value + 1)} />}

      <SectionPanel
        title="Approval queue"
        description="Approve or reject pending leave. Decisions notify the requester."
      >
        <DataTable
          columns={columns}
          rows={pending}
          rowKey={(row) => row.id}
          loading={loading}
          emptyMessage="No requests are waiting for your approval."
        />
      </SectionPanel>

      {reviewed.length > 0 && (
        <SectionPanel title="Recently reviewed" description="Your last leave decisions.">
          <DataTable
            columns={historyColumns}
            rows={reviewed}
            rowKey={(row) => row.id}
            emptyMessage="No decisions recorded yet."
          />
        </SectionPanel>
      )}

      <FormDialog
        open={Boolean(rejecting)}
        title="Reject leave request"
        onClose={() => {
          setRejecting(null);
          setRejectReason('');
        }}
        footer={
          <FormDialogFooter
            onCancel={() => {
              setRejecting(null);
              setRejectReason('');
            }}
            submitLabel="Reject request"
            submitting={Boolean(rejecting && busyId === rejecting.id)}
            formId="leave-reject-form"
            disabled={!rejectReason.trim()}
          />
        }
      >
        <form
          id="leave-reject-form"
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (rejecting) void review(rejecting, 'reject');
          }}
        >
          <p className="text-sm text-muted-foreground">
            Rejecting <span className="font-semibold">{rejecting?.requester_name}</span>’s request
            from {formatDate(rejecting?.start_date)} to {formatDate(rejecting?.end_date)}.
          </p>
          <TextAreaField
            label="Reason for rejection"
            required
            rows={3}
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Explain why this leave cannot be approved…"
          />
        </form>
      </FormDialog>
    </div>
  );
}

export function LeaveHolidaysScreen() {
  return (
    <LeaveGate>
      {(data) => {
        const today = todayInput();
        const upcoming = data.holidays.filter((holiday) => holiday.date >= today);
        const past = data.holidays
          .filter((holiday) => holiday.date < today)
          .sort((a, b) => b.date.localeCompare(a.date));
        const next = upcoming[0] ?? null;
        const nextDays = next ? leaveDays(today, next.date) - 1 : 0;

        const columns: DataColumn<PortalHoliday>[] = [
          { key: 'name', header: 'Holiday', render: (row) => <span className="font-semibold">{row.name}</span> },
          { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
          {
            key: 'day',
            header: 'Day',
            render: (row) => {
              const parsed = new Date(row.date);
              return Number.isNaN(parsed.getTime())
                ? '—'
                : parsed.toLocaleDateString(undefined, { weekday: 'long' });
            },
          },
          {
            key: 'recurring',
            header: 'Recurring',
            render: (row) => (row.isRecurring ? 'Every year' : '—'),
          },
          {
            key: 'description',
            header: 'Notes',
            render: (row) => (
              <span className="block max-w-[280px] truncate" title={row.description || ''}>
                {row.description || '—'}
              </span>
            ),
          },
        ];

        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Holidays"
              description="Published holidays that apply to your leave planning."
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Upcoming" value={upcoming.length} accent="gold" />
              <StatCard label="This year" value={data.holidays.filter((holiday) => holiday.date.startsWith(String(new Date().getFullYear()))).length} accent="blue" />
              <StatCard label="Recorded" value={data.holidays.length} accent="green" />
              <StatCard
                label="Next holiday"
                value={next ? `${nextDays}d` : '—'}
                accent="purple"
                hint={next ? next.name : 'None scheduled'}
              />
            </div>

            <SectionPanel
              title="Upcoming holidays"
              description="Plan leave around published closures."
            >
              <DataTable
                columns={columns}
                rows={upcoming}
                rowKey={(row) => row.id}
                emptyMessage="No upcoming holidays published."
              />
            </SectionPanel>

            {past.length > 0 && (
              <SectionPanel title="Past holidays">
                <DataTable
                  columns={columns}
                  rows={past.slice(0, 12)}
                  rowKey={(row) => row.id}
                  emptyMessage="No past holidays recorded."
                />
              </SectionPanel>
            )}
          </div>
        );
      }}
    </LeaveGate>
  );
}
