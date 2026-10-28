'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBanner, ListPageShell, StatusChip, statusToneFromValue } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';

type MessageRow = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  subject?: string | null;
  message?: string | null;
  category?: string | null;
  source?: string | null;
  status: string;
  created_at?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

export default function SupportMessagesPage() {
  const [items, setItems] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/support/messages');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load messages');
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load messages';
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
    (item: MessageRow) => !status || item.status === status,
    [status]
  );

  const list = useListQuery({
    items: items as (MessageRow & Record<string, unknown>)[],
    searchKeys: ['name', 'email', 'subject', 'message', 'category', 'source', 'status'],
    filterKey: status,
    filterFn: filterFn as (item: MessageRow & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.status).filter(Boolean));
    return [...set].map((s) => ({ value: s, label: s }));
  }, [items]);

  return (
    <ListPageShell
      title="Messages"
      description="Inbound contact messages and inquiries"
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search sender, subject, or message…"
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
          header: 'From',
          render: (r) => (
            <div>
              <div className="font-semibold">{r.name || '—'}</div>
              <div className="text-xs text-muted-foreground">{r.email || r.phone || ''}</div>
            </div>
          ),
        },
        {
          key: 'subject',
          header: 'Subject',
          render: (r) => (
            <div>
              <div>{r.subject || '—'}</div>
              {r.message && (
                <div className="max-w-[320px] truncate text-xs text-muted-foreground">
                  {r.message}
                </div>
              )}
            </div>
          ),
        },
        { key: 'category', header: 'Category' },
        { key: 'source', header: 'Source' },
        {
          key: 'status',
          header: 'Status',
          render: (r) => (
            <StatusChip label={r.status} tone={statusToneFromValue(r.status)} />
          ),
        },
        {
          key: 'created_at',
          header: 'Received',
          render: (r) => formatDate(r.created_at),
        },
      ]}
      rows={list.rows as MessageRow[]}
      rowKey={(r) => r.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No messages."
    >
      {error && <ErrorBanner message={error} />}
    </ListPageShell>
  );
}
