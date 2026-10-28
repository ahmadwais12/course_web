'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ListPageShell,
  StatusChip,
  statusToneFromValue,
  StatCard,
} from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';

type ObserverRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  role_name?: string | null;
  status?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

/** Read-only directory of accounts and their assigned roles. */
export default function ObserversDirectoryPage() {
  const [items, setItems] = useState<ObserverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');

  const fetchObservers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchObservers();
  }, [fetchObservers]);

  const roleOf = useCallback(
    (row: ObserverRow) => String(row.role_name ?? row.role ?? '—'),
    []
  );

  const filterFn = useCallback(
    (row: ObserverRow) => !roleFilter || roleOf(row) === roleFilter,
    [roleFilter, roleOf]
  );

  const list = useListQuery({
    items,
    searchKeys: ['full_name', 'email', 'phone', 'role_name', 'role'],
    filterKey: roleFilter,
    filterFn,
  });

  const roleOptions = useMemo(() => {
    const set = new Set(items.map((i) => roleOf(i)));
    return [...set].sort().map((r) => ({ value: r, label: r }));
  }, [items, roleOf]);

  const activeCount = items.filter((i) => i.status === 'active').length;

  return (
    <ListPageShell
      title="Account Directory"
      description="Read-only directory of accounts and their assigned roles"
      pill="READ ONLY"
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search name, email, phone, or role…"
      onResetFilters={() => {
        list.reset();
        setRoleFilter('');
      }}
      filters={[
        {
          key: 'role',
          label: 'Role',
          value: roleFilter,
          options: roleOptions,
          onChange: setRoleFilter,
        },
      ]}
      loading={loading}
      columns={[
        {
          key: 'full_name',
          header: 'Observer',
          render: (r) => (
            <div>
              <div className="font-semibold">{r.full_name || '—'}</div>
              {r.email && (
                <div className="text-xs text-muted-foreground">{r.email}</div>
              )}
            </div>
          ),
        },
        {
          key: 'role_name',
          header: 'Role',
          render: (r) => <span className="capitalize">{roleOf(r)}</span>,
        },
        {
          key: 'phone',
          header: 'Phone',
          render: (r) => r.phone || '—',
        },
        {
          key: 'status',
          header: 'Status',
          render: (r) => (
            <StatusChip
              label={r.status || 'unknown'}
              tone={statusToneFromValue(r.status || '')}
            />
          ),
        },
      ]}
      rows={list.rows}
      rowKey={(r) => r.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No observers found."
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-1">
        <StatCard
          label="Total accounts"
          value={items.length}
          hint="Loaded from /api/users"
          valueClassName="text-sky-500"
        />
        <StatCard
          label="Active"
          value={activeCount}
          hint="is_active = true"
          valueClassName="text-emerald-500"
        />
        <StatCard
          label="Distinct roles"
          value={roleOptions.length}
          hint="Roles present"
          valueClassName="text-[20px]"
        />
      </div>
    </ListPageShell>
  );
}
