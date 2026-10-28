'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBanner, ListPageShell, StatusChip, statusToneFromValue } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';

type StaffRow = {
  id: string;
  name: string;
  role: string;
  salary: number;
  status: string;
  email?: string | null;
  employee_code?: string | null;
};

export default function HrStaffPage() {
  const [items, setItems] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/staff');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load staff');
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load staff';
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
    (item: StaffRow) => !status || item.status === status,
    [status]
  );

  const list = useListQuery({
    items: items as (StaffRow & Record<string, unknown>)[],
    searchKeys: ['name', 'role', 'email', 'employee_code'],
    filterKey: status,
    filterFn: filterFn as (item: StaffRow & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.status).filter(Boolean));
    return [...set].map((s) => ({ value: s, label: s }));
  }, [items]);

  return (
    <ListPageShell
      title="Staff Directory"
      description="Employee records, roles, contact details, and salaries"
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search name, role, code, or email…"
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
          header: 'Employee',
          render: (r) => (
            <div>
              <div className="font-semibold">{r.name || '—'}</div>
              <div className="text-xs text-muted-foreground">{r.employee_code}</div>
            </div>
          ),
        },
        { key: 'role', header: 'Role' },
        { key: 'email', header: 'Email' },
        {
          key: 'salary',
          header: 'Salary',
          align: 'right',
          render: (r) => `$${Number(r.salary || 0).toLocaleString()}`,
        },
        {
          key: 'status',
          header: 'Status',
          render: (r) => (
            <StatusChip label={r.status} tone={statusToneFromValue(r.status)} />
          ),
        },
      ]}
      rows={list.rows as StaffRow[]}
      rowKey={(r) => r.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No staff records yet."
    >
      {error && <ErrorBanner message={error} />}
    </ListPageShell>
  );
}
