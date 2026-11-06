'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, Eye, UserX } from 'lucide-react';
import {
  DetailDialog,
  ErrorBanner,
  FormDialog,
  ListPageShell,
  PortButton,
  RowActions,
  StatCard,
  StatusChip,
  TextAreaField,
  statusToneFromValue,
  type RowActionItem,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import {
  DELETION_SOURCES,
  DELETION_STATUSES,
  DELETION_SLA_DAYS,
  deletionSourceLabel,
  deletionStatusLabel,
  type DeletionRequestAdminRow,
} from '@/lib/account-deletion';

type Decision = { row: DeletionRequestAdminRow; action: 'complete' | 'reject' };

const DAY_MS = 24 * 60 * 60 * 1000;

function daysOpen(row: DeletionRequestAdminRow) {
  return Math.floor((Date.now() - new Date(row.created_at).getTime()) / DAY_MS);
}

function accountState(row: DeletionRequestAdminRow) {
  if (!row.user_id || !row.account) return { label: 'No matching account', tone: 'gray' as const };
  if (row.account.deleted_at) return { label: 'In trash', tone: 'gray' as const };
  if (row.account.is_active === false) return { label: 'Inactive', tone: 'purple' as const };
  return { label: 'Active', tone: 'green' as const };
}

export default function DeletionRequestsPage() {
  const [items, setItems] = useState<DeletionRequestAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('pending');
  const [source, setSource] = useState('');
  const [viewing, setViewing] = useState<DeletionRequestAdminRow | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch('/api/users/deletion-requests', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load deletion requests');
      setItems(Array.isArray(data.items) ? data.items : []);
      setError(null);
    } catch (e) {
      if (!opts?.silent) {
        setItems([]);
        setError(e instanceof Error ? e.message : 'Failed to load deletion requests');
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useLiveRefresh({
    intervalMs: 30_000,
    enabled: !decision && !viewing,
    onRefresh: () => load({ silent: true }),
  });

  const filterFn = useCallback(
    (row: DeletionRequestAdminRow) => (!status || row.status === status) && (!source || row.source === source),
    [status, source]
  );

  const list = useListQuery({
    items: items as (DeletionRequestAdminRow & Record<string, unknown>)[],
    searchKeys: ['full_name', 'email', 'phone', 'reason', 'tenant_name'],
    filterKey: `${status}|${source}`,
    filterFn: filterFn as (row: DeletionRequestAdminRow & Record<string, unknown>) => boolean,
  });

  const stats = useMemo(() => {
    const pending = items.filter((r) => r.status === 'pending');
    return {
      pending: pending.length,
      overdue: pending.filter((r) => daysOpen(r) >= DELETION_SLA_DAYS).length,
      completed: items.filter((r) => r.status === 'completed').length,
      rejected: items.filter((r) => r.status === 'rejected').length,
      cancelled: items.filter((r) => r.status === 'cancelled').length,
    };
  }, [items]);

  const openDecision = (row: DeletionRequestAdminRow, action: Decision['action']) => {
    setDecision({ row, action });
    setNote('');
    setFormError(null);
  };

  const decide = async () => {
    if (!decision) return;
    if (decision.action === 'reject' && !note.trim()) {
      setFormError('Add a note so the person knows why the request was rejected.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/users/deletion-requests/${decision.row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: decision.action, admin_note: note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update the request');
      toast.success(data.message || 'Request updated');
      setDecision(null);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not update the request');
    } finally {
      setSaving(false);
    }
  };

  const isComplete = decision?.action === 'complete';
  const target = decision?.row;

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} />}

      <ListPageShell
        title="Account Deletion Requests"
        description={`Requests from the public Delete account page and the mobile app. Finish each one within ${DELETION_SLA_DAYS} days.`}
        pill={loading ? 'LOADING…' : `LIVE · ${list.total} REQUESTS`}
        primaryAction={{ label: loading ? 'Refreshing…' : 'Refresh', onClick: () => load() }}
        secondaryActions={
          <PortButton onClick={() => window.open('/account-deletion', '_blank', 'noopener')}>
            Open public page
          </PortButton>
        }
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search name, email, phone, reason…"
        filterTitle="Filter deletion requests"
        filterDescription="Narrow by status or where the request came from."
        filters={[
          { key: 'status', label: 'Status', value: status, onChange: setStatus, options: DELETION_STATUSES },
          { key: 'source', label: 'Source', value: source, onChange: setSource, options: DELETION_SOURCES },
        ]}
        onResetFilters={() => {
          setStatus('');
          setSource('');
          list.reset();
        }}
        columns={[
          {
            key: 'created_at',
            header: 'Requested',
            render: (row) => {
              const open = row.status === 'pending' ? daysOpen(row) : null;
              return (
                <div>
                  <div className="font-medium text-foreground">{new Date(row.created_at).toLocaleDateString()}</div>
                  <div
                    className={
                      open != null && open >= DELETION_SLA_DAYS ? 'text-xs font-semibold text-destructive' : 'text-xs text-muted-foreground'
                    }
                  >
                    {open != null ? `${open} day${open === 1 ? '' : 's'} open` : deletionSourceLabel(row.source)}
                  </div>
                </div>
              );
            },
          },
          {
            key: 'person',
            header: 'Person',
            render: (row) => (
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">
                  {row.full_name || row.account?.full_name || '—'}
                </div>
                <div className="truncate text-xs text-muted-foreground">{row.email}</div>
              </div>
            ),
          },
          {
            key: 'account',
            header: 'Account',
            render: (row) => {
              const state = accountState(row);
              return (
                <div className="flex flex-col items-start gap-1">
                  <StatusChip label={state.label} tone={state.tone} />
                  {row.account?.role && (
                    <span className="text-xs capitalize text-muted-foreground">
                      {row.account.role.replace(/_/g, ' ')}
                      {row.tenant_name ? ` · ${row.tenant_name}` : ''}
                    </span>
                  )}
                </div>
              );
            },
          },
          {
            key: 'reason',
            header: 'Reason',
            render: (row) => (
              <span className="line-clamp-2 max-w-xs text-sm text-muted-foreground">{row.reason || '—'}</span>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusChip label={deletionStatusLabel(row.status)} tone={statusToneFromValue(row.status)} />
            ),
          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) => {
              const r = row as DeletionRequestAdminRow;
              const actions: RowActionItem[] = [
                { key: 'view', label: 'View details', icon: <Eye size={16} />, onClick: () => setViewing(r) },
              ];
              if (r.status === 'pending') {
                actions.push(
                  {
                    key: 'complete',
                    label: 'Delete account',
                    icon: <UserX size={16} />,
                    onClick: () => openDecision(r, 'complete'),
                    danger: true,
                  },
                  { key: 'reject', label: 'Reject', icon: <Ban size={16} />, onClick: () => openDecision(r, 'reject') }
                );
              }
              return (
                <div className="flex justify-end">
                  <RowActions maxInline={3} items={actions} />
                </div>
              );
            },
          },
        ]}
        rows={list.rows as DeletionRequestAdminRow[]}
        rowKey={(row) => row.id}
        loading={loading}
        emptyMessage={status === 'pending' ? 'No pending deletion requests.' : 'No deletion requests match these filters.'}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Pending"
            value={loading ? '—' : stats.pending}
            hint={stats.overdue ? `${stats.overdue} past ${DELETION_SLA_DAYS} days` : 'Waiting for review'}
            accent="gold"
          />
          <StatCard label="Accounts deleted" value={loading ? '—' : stats.completed} hint="Moved to Trash" accent="green" />
          <StatCard label="Rejected" value={loading ? '—' : stats.rejected} hint="Closed with a note" accent="purple" />
          <StatCard label="Cancelled" value={loading ? '—' : stats.cancelled} hint="Withdrawn by the user" accent="blue" />
        </div>
      </ListPageShell>

      <FormDialog
        open={Boolean(decision)}
        title={isComplete ? 'Delete this account?' : 'Reject deletion request'}
        onClose={() => !saving && setDecision(null)}
        maxWidth="lg"
        footer={
          <>
            <PortButton variant="ghost" onClick={() => setDecision(null)} disabled={saving}>
              Cancel
            </PortButton>
            <PortButton variant={isComplete ? 'danger' : 'primary'} onClick={decide} disabled={saving}>
              {saving ? 'Working…' : isComplete ? 'Delete account' : 'Reject request'}
            </PortButton>
          </>
        }
      >
        {target && (
          <div className="space-y-3 text-sm">
            {formError && <ErrorBanner message={formError} />}
            <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
              <div className="font-semibold text-foreground">{target.full_name || target.account?.full_name || target.email}</div>
              <div className="text-muted-foreground">{target.email}</div>
            </div>
            {isComplete ? (
              <p className="text-foreground">
                {target.user_id || target.account
                  ? 'The account is deactivated, moved to Trash, and blocked from signing in. Purge it from Trash to erase it permanently.'
                  : 'No account is linked yet. The system checks the email again; if nothing matches, the request is simply closed.'}
              </p>
            ) : (
              <p className="text-foreground">
                The account stays active. If the person has an account, they receive your note as a notification.
              </p>
            )}
            <TextAreaField
              label={isComplete ? 'Note (optional)' : 'Reason for rejecting'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={2000}
              required={!isComplete}
            />
          </div>
        )}
      </FormDialog>

      <DetailDialog
        open={Boolean(viewing)}
        title="Deletion request"
        onClose={() => setViewing(null)}
        rows={
          viewing
            ? [
                { label: 'Request #', value: viewing.nid != null ? String(viewing.nid) : viewing.id },
                { label: 'Status', value: deletionStatusLabel(viewing.status) },
                { label: 'Name', value: viewing.full_name || viewing.account?.full_name || '' },
                { label: 'Email', value: viewing.email },
                { label: 'Phone', value: viewing.phone || '' },
                { label: 'Account', value: accountState(viewing).label },
                { label: 'Role', value: viewing.account?.role?.replace(/_/g, ' ') || '' },
                { label: 'Business', value: viewing.tenant_name || '' },
                { label: 'Source', value: deletionSourceLabel(viewing.source) },
                { label: 'Requested', value: new Date(viewing.created_at).toLocaleString() },
                { label: 'Reason', value: viewing.reason || '' },
                { label: 'Reviewed by', value: viewing.reviewer_name || '' },
                { label: 'Reviewed', value: viewing.reviewed_at ? new Date(viewing.reviewed_at).toLocaleString() : '' },
                { label: 'Team note', value: viewing.admin_note || '' },
                { label: 'IP address', value: viewing.ip_address || '' },
              ]
            : []
        }
      />
    </div>
  );
}
