'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBanner, ListPageShell, StatusChip, statusToneFromValue } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';

type TicketRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  priority: string;
  status: string;
  location?: string | null;
  reported_by_name?: string | null;
};

function priorityTone(priority: string) {
  const value = priority.toLowerCase();
  if (['urgent', 'high', 'critical'].includes(value)) return 'purple' as const;
  if (['medium', 'normal'].includes(value)) return 'gold' as const;
  return 'gray' as const;
}

export default function SupportTicketsPage() {
  const [items, setItems] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/support/tickets');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load support tickets');
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load support tickets';
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
    (item: TicketRow) =>
      (!status || item.status === status) && (!priority || item.priority === priority),
    [status, priority]
  );

  const list = useListQuery({
    items: items as (TicketRow & Record<string, unknown>)[],
    searchKeys: ['title', 'description', 'category', 'location', 'reported_by_name', 'status'],
    filterKey: `${status}|${priority}`,
    filterFn: filterFn as (item: TicketRow & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.status).filter(Boolean));
    return [...set].map((s) => ({ value: s, label: s }));
  }, [items]);

  const priorityOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.priority).filter(Boolean));
    return [...set].map((s) => ({ value: s, label: s }));
  }, [items]);

  return (
    <ListPageShell
      title="Support Tickets"
      description="Issues reported by students, staff, and visitors"
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search subject, category, or reporter…"
      onResetFilters={() => {
        list.reset();
        setStatus('');
        setPriority('');
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
          key: 'priority',
          label: 'Priority',
          value: priority,
          options: priorityOptions,
          onChange: setPriority,
        },
      ]}
      loading={loading}
      columns={[
        {
          key: 'title',
          header: 'Subject',
          render: (r) => (
            <div>
              <div className="font-semibold">{r.title || '—'}</div>
              {r.description && (
                <div className="max-w-[320px] truncate text-xs text-muted-foreground">
                  {r.description}
                </div>
              )}
            </div>
          ),
        },
        { key: 'category', header: 'Category' },
        {
          key: 'priority',
          header: 'Priority',
          render: (r) => <StatusChip label={r.priority} tone={priorityTone(r.priority)} />,
        },
        { key: 'location', header: 'Location' },
        { key: 'reported_by_name', header: 'Reported by' },
        {
          key: 'status',
          header: 'Status',
          render: (r) => (
            <StatusChip label={r.status} tone={statusToneFromValue(r.status)} />
          ),
        },
      ]}
      rows={list.rows as TicketRow[]}
      rowKey={(r) => r.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No support tickets."
    >
      {error && <ErrorBanner message={error} />}
    </ListPageShell>
  );
}
