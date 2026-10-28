'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBanner, ListPageShell, StatusChip, statusToneFromValue } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';

type ClassRow = {
  id: string;
  name: string;
  grade?: string | null;
  year?: string | number | null;
  student_count?: number;
  status: string;
};

export default function ClassesPage() {
  const [items, setItems] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/classes');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load classes');
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load classes';
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
    (item: ClassRow) => !status || item.status === status,
    [status]
  );

  const list = useListQuery({
    items: items as (ClassRow & Record<string, unknown>)[],
    searchKeys: ['name', 'grade', 'year'],
    filterKey: status,
    filterFn: filterFn as (item: ClassRow & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.status).filter(Boolean));
    return [...set].map((s) => ({ value: s, label: s }));
  }, [items]);

  return (
    <ListPageShell
      title="Classes"
      description="Class groups, grade levels, and enrollment counts"
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search by class, grade, or year…"
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
        { key: 'name', header: 'Class' },
        { key: 'grade', header: 'Grade' },
        { key: 'year', header: 'Year' },
        { key: 'student_count', header: 'Students', align: 'right' },
        {
          key: 'status',
          header: 'Status',
          render: (r) => (
            <StatusChip label={r.status} tone={statusToneFromValue(r.status)} />
          ),
        },
      ]}
      rows={list.rows as ClassRow[]}
      rowKey={(r) => r.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No classes yet."
    >
      {error && <ErrorBanner message={error} />}
    </ListPageShell>
  );
}
