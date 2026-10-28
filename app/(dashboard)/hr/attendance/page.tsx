'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBanner, ListPageShell, StatusChip, statusToneFromValue } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';

type AttendanceRow = {
  id: string;
  employee_name: string;
  employee_code?: string | null;
  date?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  late_minutes?: number;
  status: string;
};

export default function HrAttendancePage() {
  const [items, setItems] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/hr/attendance');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load staff attendance');
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load staff attendance';
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
    (item: AttendanceRow) => !status || item.status === status,
    [status]
  );

  const list = useListQuery({
    items: items as (AttendanceRow & Record<string, unknown>)[],
    searchKeys: ['employee_name', 'employee_code', 'date', 'status'],
    filterKey: status,
    filterFn: filterFn as (item: AttendanceRow & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.status).filter(Boolean));
    return [...set].map((s) => ({ value: s, label: s }));
  }, [items]);

  return (
    <ListPageShell
      title="Staff Attendance"
      description="Daily check-in and check-out records for employees"
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search employee or date…"
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
          key: 'employee_name',
          header: 'Employee',
          render: (r) => (
            <div>
              <div className="font-semibold">{r.employee_name || '—'}</div>
              <div className="text-xs text-muted-foreground">{r.employee_code}</div>
            </div>
          ),
        },
        { key: 'date', header: 'Date' },
        { key: 'check_in', header: 'Check in' },
        { key: 'check_out', header: 'Check out' },
        {
          key: 'late_minutes',
          header: 'Late (min)',
          align: 'right',
          render: (r) => Number(r.late_minutes || 0),
        },
        {
          key: 'status',
          header: 'Status',
          render: (r) => (
            <StatusChip label={r.status} tone={statusToneFromValue(r.status)} />
          ),
        },
      ]}
      rows={list.rows as AttendanceRow[]}
      rowKey={(r) => r.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No staff attendance records."
    >
      {error && <ErrorBanner message={error} />}
    </ListPageShell>
  );
}
