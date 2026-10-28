'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBanner, ListPageShell, StatusChip, statusToneFromValue } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';

type CallbackRow = {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  topic?: string | null;
  preferred_date?: string | null;
  preferred_time_from?: string | null;
  preferred_time_to?: string | null;
  status: string;
  created_at?: string | null;
};

function preferredLabel(row: CallbackRow) {
  const time = [row.preferred_time_from, row.preferred_time_to].filter(Boolean).join(' – ');
  const value = [row.preferred_date, time].filter(Boolean).join(' · ');
  return value || '—';
}

export default function CallCenterPage() {
  const [items, setItems] = useState<CallbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/support/call-center');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load callbacks');
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load callbacks';
          setItems([]);
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filterFn = useCallback(
    (item: CallbackRow) => !status || item.status === status,
    [status]
  );

  const list = useListQuery({
    items: items as (CallbackRow & Record<string, unknown>)[],
    searchKeys: ['name', 'phone', 'email', 'topic', 'status'],
    filterKey: status,
    filterFn: filterFn as (item: CallbackRow & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.status).filter(Boolean));
    return [...set].map((s) => ({ value: s, label: s }));
  }, [items]);

  return (
    <ListPageShell
      title="Call Center"
      description="Callback requests and the call queue"
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search caller, phone, or topic…"
      onResetFilters={() => {
        list.reset();
        setStatus('');
      }}
      filters={[
        {
          key: 'status',
          label: 'Status',
          value: status,
          options: statusOptions,
          onChange: setStatus,
        },
      ]}
      loading={loading}
      columns={[
        {
          key: 'name',
          header: 'Caller',
          render: (r) => (
            <div>
              <div className="font-semibold">{r.name || '—'}</div>
              <div className="text-xs text-muted-foreground">{r.phone || r.email}</div>
            </div>
          ),
        },
        { key: 'topic', header: 'Topic' },
        { key: 'email', header: 'Email' },
        {
          key: 'preferred',
          header: 'Preferred time',
          render: (r) => preferredLabel(r),
        },
        {
          key: 'status',
          header: 'Status',
          render: (r) => (
            <StatusChip label={r.status} tone={statusToneFromValue(r.status)} />
          ),
        },
        {
          key: 'created_at',
          header: 'Requested',
          render: (r) => (r.created_at ? String(r.created_at).slice(0, 10) : '—'),
        },
      ]}
      rows={list.rows as CallbackRow[]}
      rowKey={(r) => r.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No callback requests."
    >
      {error && <ErrorBanner message={error} />}
    </ListPageShell>
  );
}
