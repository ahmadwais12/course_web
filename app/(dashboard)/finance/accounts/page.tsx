'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ErrorBanner, ListPageShell, PortButton, StatCard, StatusChip } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { money } from '@/lib/display';

type AccountRow = {
  id: string;
  code: string | null;
  name: string;
  type: string;
  normalBalance: string;
  description: string | null;
  isActive: boolean;
  parentId: string | null;
  displayOrder: number;
};

type Summary = {
  accounts: number;
  active: number;
  assets: number;
  cashBalance: number;
  bankBalance: number;
  totalExpenses: number;
  netPosition: number;
};

const TYPE_TONE: Record<string, 'green' | 'gold' | 'purple' | 'blue' | 'gray'> = {
  asset: 'green',
  liability: 'purple',
  equity: 'blue',
  income: 'gold',
  expense: 'gray',
};

export default function AccountsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState('');
  const [activity, setActivity] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/finance/accounts');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load accounts');
        if (!cancelled) {
          setRows(Array.isArray(data.rows) ? data.rows : []);
          setSummary(data.summary ?? null);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load accounts';
          setRows([]);
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
    (row: AccountRow) =>
      (!type || row.type === type) &&
      (!activity || (activity === 'active' ? row.isActive : !row.isActive)),
    [type, activity]
  );

  const list = useListQuery({
    items: rows as (AccountRow & Record<string, unknown>)[],
    searchKeys: ['code', 'name', 'type', 'description'],
    filterKey: `${type}|${activity}`,
    filterFn: filterFn as (row: AccountRow & Record<string, unknown>) => boolean,
  });

  const parentById = useMemo(
    () => new Map(rows.map((row) => [row.id, row.name])),
    [rows]
  );

  return (
    <ListPageShell
      title="Accounts"
      description="Cash, bank, and ledger accounts with the current cash position"
      secondaryActions={
        <PortButton variant="secondary" onClick={() => router.push('/finance/chart-of-accounts')}>
          Manage chart of accounts
        </PortButton>
      }
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search account name or code…"
      onResetFilters={() => {
        list.reset();
        setType('');
        setActivity('');
      }}
      filters={[
        {
          key: 'type',
          label: 'Account type',
          value: type,
          options: [
            { value: 'asset', label: 'Assets' },
            { value: 'liability', label: 'Liabilities' },
            { value: 'equity', label: 'Equity' },
            { value: 'income', label: 'Income' },
            { value: 'expense', label: 'Expenses' },
          ],
          onChange: setType,
        },
        {
          key: 'activity',
          label: 'Status',
          value: activity,
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ],
          onChange: setActivity,
        },
      ]}
      loading={loading}
      columns={[
        {
          key: 'name',
          header: 'Account',
          render: (row) => (
            <div>
              <div className="font-semibold">{row.name}</div>
              <div className="text-xs text-muted-foreground">{row.code || 'No code'}</div>
            </div>
          ),
        },
        {
          key: 'type',
          header: 'Type',
          render: (row) => <StatusChip label={row.type} tone={TYPE_TONE[row.type] ?? 'blue'} />,
        },
        {
          key: 'normalBalance',
          header: 'Normal balance',
          render: (row) => <span className="capitalize">{row.normalBalance}</span>,
        },
        {
          key: 'parent',
          header: 'Parent account',
          render: (row) =>
            row.parentId ? parentById.get(row.parentId) ?? '—' : <span className="text-xs text-muted-foreground">—</span>,
        },
        {
          key: 'description',
          header: 'Description',
          render: (row) => (
            <span className="block max-w-[260px] truncate" title={row.description ?? ''}>
              {row.description || '—'}
            </span>
          ),
        },
        {
          key: 'isActive',
          header: 'Status',
          render: (row) => (
            <StatusChip label={row.isActive ? 'active' : 'inactive'} tone={row.isActive ? 'green' : 'gray'} />
          ),
        },
      ]}
      rows={list.rows as AccountRow[]}
      rowKey={(row) => row.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No accounts defined yet. Add accounts from the chart of accounts."
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Net cash position"
          value={money(summary?.netPosition ?? 0)}
          accent="blue"
        />
        <StatCard label="Cash on hand" value={money(summary?.cashBalance ?? 0)} accent="green" />
        <StatCard label="Bank balance" value={money(summary?.bankBalance ?? 0)} accent="purple" />
        <StatCard label="Total expenses" value={money(summary?.totalExpenses ?? 0)} accent="gold" />
      </div>
      {error && <ErrorBanner message={error} />}
    </ListPageShell>
  );
}
