'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dropdown,
  ErrorBanner,
  InputField,
  ListPageShell,
  PortButton,
  StatusChip,
  TextAreaField,
  statusToneFromValue,
} from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';
import { toast } from '@/components/ui/Toast';
import { X } from 'lucide-react';

type RequesterType = 'student' | 'employee';

type LeaveItem = {
  id: string;
  requester_type: RequesterType;
  requester_id: string;
  requester_name: string;
  requester_code?: string | null;
  context?: string | null;
  leave_type: string;
  start_date?: string | null;
  end_date?: string | null;
  reason?: string | null;
  status: string;
  rejection_reason?: string | null;
  approver_name?: string | null;
  can_approve: boolean;
  created_at?: string | null;
};

type Me = {
  kind: RequesterType | null;
  name?: string | null;
  role?: string;
};

function daysBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return '—';
  const from = Date.parse(start);
  const to = Date.parse(end);
  if (Number.isNaN(from) || Number.isNaN(to)) return '—';
  return Math.max(1, Math.round((to - from) / 86_400_000) + 1);
}

export default function LeaveRequestsPage() {
  const [items, setItems] = useState<LeaveItem[]>([]);
  const [me, setMe] = useState<Me>({ kind: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [requesterType, setRequesterType] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [leaveType, setLeaveType] = useState('Annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<LeaveItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leaves');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load leave requests');
      setItems(Array.isArray(data.items) ? data.items : []);
      setMe(data.me ?? { kind: null });
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load leave requests';
      setItems([]);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const filterFn = useCallback(
    (item: LeaveItem) =>
      (!status || item.status === status) &&
      (!requesterType || item.requester_type === requesterType),
    [status, requesterType]
  );

  const list = useListQuery({
    items: items as (LeaveItem & Record<string, unknown>)[],
    searchKeys: ['requester_name', 'requester_code', 'leave_type', 'reason', 'context', 'status'],
    filterKey: `${status}|${requesterType}`,
    filterFn: filterFn as (item: LeaveItem & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.status).filter(Boolean));
    const values = set.size ? [...set] : ['pending', 'approved', 'rejected'];
    return values.map((s) => ({ value: s, label: s }));
  }, [items]);

  const openAdd = () => {
    const today = new Date().toISOString().slice(0, 10);
    setStartDate(today);
    setEndDate(today);
    setLeaveType('Annual');
    setReason('');
    setFormError(null);
    setShowAdd(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!me.kind) {
      setFormError('No student or employee record is linked to this account');
      toast.error('No student or employee record is linked to this account');
      return;
    }
    if (!startDate || !endDate) {
      setFormError('Start and end dates are required');
      toast.error('Start and end dates are required');
      return;
    }
    if (endDate < startDate) {
      setFormError('End date must be on or after the start date');
      toast.error('End date must be on or after the start date');
      return;
    }
    if (!reason.trim()) {
      setFormError('A reason is required');
      toast.error('A reason is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterType: me.kind,
          start_date: startDate,
          end_date: endDate,
          reason: reason.trim(),
          leave_type: me.kind === 'employee' ? leaveType : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit leave request');
      setShowAdd(false);
      const successMessage =
        data.routed_to === 'teacher'
          ? 'Request submitted. Your class teacher will review it.'
          : 'Request submitted. Your department manager will review it.';
      setNotice(successMessage);
      toast.success('Leave request submitted', { description: successMessage });
      setActionError(null);
      await fetchLeaves();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit leave request';
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const decide = async (
    item: LeaveItem,
    action: 'approve' | 'reject',
    rejection?: string
  ) => {
    setBusyId(item.id);
    setActionError(null);
    setRejectError(null);
    try {
      const res = await fetch('/api/leaves', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          requesterType: item.requester_type,
          action,
          rejection_reason: rejection,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update leave request');
      const successMessage =
        action === 'approve' ? 'Leave request approved.' : 'Leave request rejected.';
      setNotice(successMessage);
      toast.success(successMessage);
      setRejectTarget(null);
      setRejectionReason('');
      await fetchLeaves();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update leave request';
      if (action === 'reject') setRejectError(message);
      else setActionError(message);
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    if (!rejectionReason.trim()) {
      setRejectError('Please provide a reason for rejection');
      return;
    }
    await decide(rejectTarget, 'reject', rejectionReason.trim());
  };

  return (
    <>
      <ListPageShell
        title="Leave Requests"
        description="Student and employee leave requests with teacher and manager approval"
        primaryAction={me.kind ? { label: 'New Request', onClick: openAdd } : undefined}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search name, code, type, or reason…"
        onResetFilters={() => {
          list.reset();
          setStatus('');
          setRequesterType('');
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
            key: 'requester_type',
            label: 'Requester',
            value: requesterType,
            options: [
              { value: 'student', label: 'Students' },
              { value: 'employee', label: 'Employees' },
            ],
            onChange: setRequesterType,
          },
        ]}
        loading={loading}
        columns={[
          {
            key: 'requester_name',
            header: 'Requester',
            render: (r) => (
              <div>
                <div className="font-semibold">{r.requester_name || '—'}</div>
                <div className="text-xs text-muted-foreground">
                  {[r.requester_type === 'student' ? 'Student' : 'Employee', r.requester_code]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
            ),
          },
          {
            key: 'leave_type',
            header: 'Type',
            render: (r) => (
              <div>
                <div>{r.leave_type}</div>
                {r.context && (
                  <div className="text-xs text-muted-foreground">{r.context}</div>
                )}
              </div>
            ),
          },
          { key: 'start_date', header: 'From' },
          { key: 'end_date', header: 'To' },
          {
            key: 'days',
            header: 'Days',
            align: 'right',
            render: (r) => daysBetween(r.start_date, r.end_date),
          },
          {
            key: 'reason',
            header: 'Reason',
            render: (r) => (
              <span className="block max-w-[220px] truncate" title={r.reason ?? ''}>
                {r.reason || '—'}
              </span>
            ),
          },
          {
            key: 'approver_name',
            header: 'Approver',
            render: (r) =>
              r.approver_name || (
                <span className="text-xs text-muted-foreground">Unassigned</span>
              ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <StatusChip label={r.status} tone={statusToneFromValue(r.status)} />
            ),
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (r) =>
              r.can_approve ? (
                <div className="flex items-center gap-2">
                  <PortButton
                    variant="primary"
                    className="h-8 px-3 text-xs"
                    disabled={busyId === r.id}
                    onClick={() => decide(r, 'approve')}
                  >
                    Approve
                  </PortButton>
                  <PortButton
                    variant="secondary"
                    className="h-8 px-3 text-xs"
                    disabled={busyId === r.id}
                    onClick={() => {
                      setRejectTarget(r);
                      setRejectionReason('');
                      setRejectError(null);
                    }}
                  >
                    Reject
                  </PortButton>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              ),
          },
        ]}
        rows={list.rows as LeaveItem[]}
        rowKey={(r) => `${r.requester_type}-${r.id}`}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No leave requests."
      >
        {error && <ErrorBanner message={error} />}
        {actionError && <ErrorBanner message={actionError} />}
        {notice && (
          <div className="rounded-lg border border-emerald-300/50 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            {notice}
          </div>
        )}
        {!loading && !me.kind && (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            This account is not linked to a student or employee record, so it can review
            requests but cannot submit one.
          </div>
        )}
      </ListPageShell>

      {showAdd && me.kind && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="emis-dialog bg-popover text-popover-foreground w-full max-w-lg rounded-xl border border-border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-lg font-semibold">New Leave Request</h3>
              <button type="button" onClick={() => setShowAdd(false)} aria-label="Close">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Submitting as <span className="font-medium text-foreground">{me.name}</span> ·{' '}
                {me.kind === 'student' ? 'Student' : 'Employee'}
              </p>

              {me.kind === 'employee' && (
                <Dropdown
                  label="Leave type"
                  value={leaveType}
                  onChange={setLeaveType}
                  options={[
                    { value: 'Annual', label: 'Annual' },
                    { value: 'Sick', label: 'Sick' },
                    { value: 'Unpaid', label: 'Unpaid' },
                    { value: 'Emergency', label: 'Emergency' },
                    { value: 'Other', label: 'Other' },
                  ]}
                  filter={false}
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Start date"
                  required
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <InputField
                  label="End date"
                  required
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <TextAreaField
                label="Reason"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain the reason for this leave request"
              />

              <p className="text-xs text-muted-foreground">
                {me.kind === 'student'
                  ? 'Your request is routed to your class teacher for approval.'
                  : 'Your request is routed to your department manager for approval.'}
              </p>

              {formError && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <PortButton variant="ghost" type="button" onClick={() => setShowAdd(false)}>
                  Cancel
                </PortButton>
                <PortButton variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </PortButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="emis-dialog bg-popover text-popover-foreground w-full max-w-md rounded-xl border border-border shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-lg font-semibold">Reject Leave Request</h3>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                aria-label="Close"
              >
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleReject} className="px-5 py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                {rejectTarget.requester_name} ·{' '}
                {rejectTarget.start_date || '—'} to {rejectTarget.end_date || '—'}
              </p>
              <TextAreaField
                label="Rejection reason"
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Why is this request being rejected?"
              />
              {rejectError && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {rejectError}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <PortButton
                  variant="ghost"
                  type="button"
                  onClick={() => setRejectTarget(null)}
                >
                  Cancel
                </PortButton>
                <PortButton
                  variant="danger"
                  type="submit"
                  disabled={busyId === rejectTarget.id}
                >
                  {busyId === rejectTarget.id ? 'Rejecting…' : 'Reject Request'}
                </PortButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
