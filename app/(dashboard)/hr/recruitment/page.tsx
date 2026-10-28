'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBanner, ListPageShell, StatusChip, statusToneFromValue } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';

type OpeningRow = {
  id: string;
  position_title: string;
  department?: string | null;
  job_type?: string | null;
  openings?: number;
  applications_count?: number;
  deadline_date?: string | null;
  status: string;
};

export default function RecruitmentPage() {
  const [items, setItems] = useState<OpeningRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/hr/recruitment');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load recruitment');
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load recruitment';
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
    (item: OpeningRow) => !status || item.status === status,
    [status]
  );

  const list = useListQuery({
    items: items as (OpeningRow & Record<string, unknown>)[],
    searchKeys: ['position_title', 'department', 'job_type', 'status'],
    filterKey: status,
    filterFn: filterFn as (item: OpeningRow & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.status).filter(Boolean));
    return [...set].map((s) => ({ value: s, label: s }));
  }, [items]);

  return (
    <ListPageShell
      title="Recruitment"
      description="Open positions, applicant counts, and hiring deadlines"
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search position, department, or type…"
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
        { key: 'position_title', header: 'Position' },
        { key: 'department', header: 'Department' },
        { key: 'job_type', header: 'Type' },
        { key: 'openings', header: 'Openings', align: 'right' },
        { key: 'applications_count', header: 'Applications', align: 'right' },
        { key: 'deadline_date', header: 'Deadline' },
        {
          key: 'status',
          header: 'Status',
          render: (r) => (
            <StatusChip label={r.status} tone={statusToneFromValue(r.status)} />
          ),
        },
      ]}
      rows={list.rows as OpeningRow[]}
      rowKey={(r) => r.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No open positions."
    >
      {error && <ErrorBanner message={error} />}
    </ListPageShell>
  );
}
