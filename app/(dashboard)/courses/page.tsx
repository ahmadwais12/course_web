'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { ListPageShell, StatusChip, statusToneFromValue } from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';

type Course = {
  id: string;
  name?: string;
  code?: string;
  description?: string;
  credits?: number;
  status?: string;
  progress?: number;
};

export default function CoursesPage() {
  const [items, setItems] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/courses');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load courses');
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          setItems([]);
          toast.error(e instanceof Error ? e.message : 'Failed to load courses');
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
    (item: Course) => !status || item.status === status,
    [status]
  );

  const list = useListQuery({
    items: items as (Course & Record<string, unknown>)[],
    searchKeys: ['name', 'code', 'description'],
    filterKey: status,
    filterFn: filterFn as (item: Course & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.status).filter(Boolean) as string[]);
    return [...set].map((s) => ({ value: s, label: s }));
  }, [items]);

  return (
      <ListPageShell
        title="Courses"
        description="Course catalog with search and filters"
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search courses…"
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
            header: 'Course',
            render: (r) => (
              <div>
                <div className="font-semibold">{r.name || '—'}</div>
                <div className="text-xs text-muted-foreground">{r.code}</div>
              </div>
            ),
          },
          { key: 'credits', header: 'Credits' },
          {
            key: 'progress',
            header: 'Progress',
            render: (r) => `${Number(r.progress ?? 0)}%`,
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <StatusChip
                label={r.status || '—'}
                tone={statusToneFromValue(r.status || '')}
              />
            ),
          },
        ]}
        rows={list.rows as Course[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No courses found."
      />
  );
}
