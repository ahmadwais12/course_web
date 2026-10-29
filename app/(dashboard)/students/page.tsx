'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ListPageShell, StatusChip, statusToneFromValue } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { daysAgo } from '@/components/dashboards/DateFilterBar';

type Student = {
  id: string;
  student_code?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  status?: string;
  enrollment_date?: string;
};

export default function StudentsPage() {
  const [items, setItems] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState(daysAgo(364));
  const [to, setTo] = useState(daysAgo(0));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/students');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load students');
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          setItems([]);
          toast.error(e instanceof Error ? e.message : 'Failed to load students');
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
    (item: Student) => {
      const date = String(item.enrollment_date || '').slice(0, 10);
      return (
        (!status || item.status === status) &&
        (!from || !date || date >= from) &&
        (!to || !date || date <= to)
      );
    },
    [status, from, to]
  );

  const list = useListQuery({
    items: items as (Student & Record<string, unknown>)[],
    searchKeys: ['full_name', 'email', 'student_code', 'phone'],
    filterKey: `${status}|${from}|${to}`,
    filterFn: filterFn as (item: Student & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.status).filter(Boolean) as string[]);
    return [...set].map((s) => ({ value: s, label: s }));
  }, [items]);

  return (
      <ListPageShell
        title="Students"
        description="Search, filter, and browse enrolled students"
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search by name, email, code…"
        dateFrom={from}
        dateTo={to}
        onDateRangeChange={({ from: nextFrom, to: nextTo }) => {
          setFrom(nextFrom);
          setTo(nextTo);
        }}
        onResetFilters={() => {
          list.reset();
          setStatus('');
          setFrom(daysAgo(364));
          setTo(daysAgo(0));
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
            key: 'full_name',
            header: 'Student',
            render: (r) => (
              <div>
                <div className="font-semibold">{r.full_name || '—'}</div>
                <div className="text-xs text-muted-foreground">{r.student_code}</div>
              </div>
            ),
          },
          { key: 'email', header: 'Email' },
          { key: 'phone', header: 'Phone' },
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
          { key: 'enrollment_date', header: 'Enrolled' },
        ]}
        rows={list.rows as Student[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No students found. Adjust search or filters."
      />
  );
}
