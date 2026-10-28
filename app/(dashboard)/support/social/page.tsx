'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBanner, ListPageShell, StatusChip, statusToneFromValue } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';

type SocialRow = {
  id: string;
  platform?: string | null;
  url?: string | null;
  display_order: number;
  status: string;
};

export default function SocialMediaPage() {
  const [items, setItems] = useState<SocialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/support/social');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load social channels');
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load social channels';
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
    (item: SocialRow) => !status || item.status === status,
    [status]
  );

  const list = useListQuery({
    items: items as (SocialRow & Record<string, unknown>)[],
    searchKeys: ['platform', 'url', 'status'],
    filterKey: status,
    filterFn: filterFn as (item: SocialRow & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.status).filter(Boolean));
    return [...set].map((s) => ({ value: s, label: s }));
  }, [items]);

  return (
    <ListPageShell
      title="Social Media"
      description="Public social channels and their status"
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search platform or link…"
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
          key: 'platform',
          header: 'Platform',
          render: (r) => <span className="font-semibold">{r.platform || '—'}</span>,
        },
        {
          key: 'url',
          header: 'Link',
          render: (r) =>
            r.url ? (
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer noopener"
                className="block max-w-[360px] truncate text-primary hover:underline"
              >
                {r.url}
              </a>
            ) : (
              '—'
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
          key: 'display_order',
          header: 'Order',
          align: 'right',
          render: (r) => r.display_order,
        },
      ]}
      rows={list.rows as SocialRow[]}
      rowKey={(r) => r.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No social channels configured."
    >
      {error && <ErrorBanner message={error} />}
    </ListPageShell>
  );
}
