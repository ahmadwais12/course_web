'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleSlash, UserCheck } from 'lucide-react';
import {
  ErrorBanner,
  ListPageShell,
  RowActions,
  StatCard,
  StatusChip,
  statusToneFromValue,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { dateLabel } from '@/lib/display';

type LeadRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  program: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  followUpDate: string | null;
  assignedName: string | null;
  createdAt: string | null;
};

const WAITING_STATUSES = ['New', 'Contacted', 'Visited'];

function daysWaiting(createdAt: string | null) {
  if (!createdAt) return 0;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 86_400_000));
}

export default function WaitingListPage() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [overdueOnly, setOverdueOnly] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admissions/leads');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load waiting list');
      const all = (Array.isArray(data.rows) ? data.rows : []) as LeadRow[];
      setRows(all.filter((row) => WAITING_STATUSES.includes(row.status)));
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load waiting list';
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

  const today = new Date().toISOString().slice(0, 10);

  const list = useListQuery({
    items: rows as (LeadRow & Record<string, unknown>)[],
    searchKeys: ['name', 'email', 'phone', 'program'],
    filterKey: `${status}|${overdueOnly}`,
    filterFn: (row) =>
      (!status || row.status === status) &&
      (overdueOnly !== 'overdue' || (row.followUpDate !== null && row.followUpDate <= today)),
  });

  const stats = useMemo(
    () => ({
      waiting: rows.length,
      newCount: rows.filter((row) => row.status === 'New').length,
      overdue: rows.filter((row) => row.followUpDate && row.followUpDate <= today).length,
      oldest: rows.reduce((max, row) => Math.max(max, daysWaiting(row.createdAt)), 0),
    }),
    [rows, today]
  );

  const updateStatus = async (id: string, next: string) => {
    try {
      const res = await fetch('/api/admissions/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update applicant');
      toast.success(next === 'Admitted' ? 'Applicant admitted' : `Applicant marked ${next.toLowerCase()}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update applicant');
    }
  };

  return (
    <ListPageShell
      title="Waiting List"
      description="Open applications still waiting for a visit, decision, or admission."
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search applicant, phone, or program…"
      onResetFilters={() => {
        list.reset();
        setStatus('');
        setOverdueOnly('');
      }}
      filters={[
        {
          key: 'status',
          label: 'Status',
          value: status,
          options: [
            { value: 'New', label: 'New' },
            { value: 'Contacted', label: 'Contacted' },
            { value: 'Visited', label: 'Visited' },
          ],
          onChange: setStatus,
        },
        {
          key: 'followup',
          label: 'Follow-up',
          value: overdueOnly,
          options: [{ value: 'overdue', label: 'Due today or overdue' }],
          onChange: setOverdueOnly,
        },
      ]}
      loading={loading}
      columns={[
        {
          key: 'name',
          header: 'Applicant',
          render: (row) => (
            <div>
              <div className="font-semibold">{row.name}</div>
              <div className="text-xs text-muted-foreground">
                {[row.phone, row.email].filter(Boolean).join(' · ') || 'No contact details'}
              </div>
            </div>
          ),
        },
        { key: 'program', header: 'Interested program', render: (row) => row.program || '—' },
        {
          key: 'waiting',
          header: 'Waiting',
          align: 'center',
          render: (row) => `${daysWaiting(row.createdAt)} days`,
        },
        {
          key: 'followUp',
          header: 'Follow-up',
          render: (row) => (
            <span className={row.followUpDate && row.followUpDate <= today ? 'font-semibold text-destructive' : ''}>
              {dateLabel(row.followUpDate)}
            </span>
          ),
        },
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
                  key: 'visited',
                  label: 'Mark visited',
                  icon: <UserCheck size={16} />,
                  onClick: () => void updateStatus(row.id, 'Visited'),
                  disabled: row.status === 'Visited',
                },
                {
                  key: 'admit',
                  label: 'Admit applicant',
                  icon: <CheckCircle2 size={16} />,
                  onClick: () => void updateStatus(row.id, 'Admitted'),
                },
                {
                  key: 'lost',
                  label: 'Remove from waiting list',
                  icon: <CircleSlash size={16} />,
                  onClick: () => void updateStatus(row.id, 'Lost'),
                  danger: true,
                },
              ]}
            />
          ),
        },
      ]}
      rows={list.rows as LeadRow[]}
      rowKey={(row) => row.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="Nobody is waiting right now — every open application has moved forward."
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Waiting applicants" value={stats.waiting} accent="blue" />
        <StatCard label="New enquiries" value={stats.newCount} accent="gold" />
        <StatCard label="Follow-up due" value={stats.overdue} accent="purple" />
        <StatCard label="Longest wait" value={`${stats.oldest} days`} accent="green" />
      </div>
      {error && <ErrorBanner message={error} />}
    </ListPageShell>
  );
}
