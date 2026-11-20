'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ErrorBanner,
  ListPageShell,
  StatusChip,
  statusToneFromValue,
} from '@/components/ports';
import type { FilterField } from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';
import {
  CAMPAIGN_PRIORITIES,
  DISCREPANCY_STATUSES,
  DISCREPANCY_TYPES,
  labelFrom,
} from '@/lib/verification';
import { VerificationTabs, shortDate } from './shared';

type Discrepancy = {
  id: string;
  code: string;
  asset_code: string;
  asset_name: string;
  branch_name: string;
  type: string;
  priority: string;
  status: string;
  description: string;
  reported_by_name: string;
  reported_at: string;
  assigned_reviewer_name: string;
  resolution: string;
};

export default function VerificationDiscrepanciesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Discrepancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/verification/discrepancies', { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load discrepancies');
      setRows(body as Discrepancy[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load discrepancies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        key: 'status',
        label: 'Status',
        value: statusFilter,
        options: DISCREPANCY_STATUSES.map((row) => ({ value: row.value, label: row.label })),
        onChange: setStatusFilter,
        placeholder: 'All statuses',
      },
      {
        key: 'type',
        label: 'Discrepancy type',
        value: typeFilter,
        options: DISCREPANCY_TYPES.map((row) => ({ value: row.value, label: row.label })),
        onChange: setTypeFilter,
        placeholder: 'All types',
      },
      {
        key: 'priority',
        label: 'Priority',
        value: priorityFilter,
        options: CAMPAIGN_PRIORITIES.map((row) => ({ value: row.value, label: row.label })),
        onChange: setPriorityFilter,
        placeholder: 'All priorities',
      },
    ],
    [statusFilter, typeFilter, priorityFilter]
  );

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (statusFilter && row.status !== statusFilter) return false;
        if (typeFilter && row.type !== typeFilter) return false;
        if (priorityFilter && row.priority !== priorityFilter) return false;
        return true;
      }),
    [rows, statusFilter, typeFilter, priorityFilter]
  );

  const query = useListQuery({
    items: filtered as unknown as (Discrepancy & Record<string, unknown>)[],
    searchKeys: ['code', 'asset_code', 'asset_name', 'branch_name', 'description'],
    filterKey: `${statusFilter}|${typeFilter}|${priorityFilter}`,
  });

  return (
    <ListPageShell
      title="Verification discrepancies"
      description="Issues raised by officers during physical verification. Head office reviews, resolves, and approves corrections."
      search={query.search}
      onSearchChange={query.setSearch}
      searchPlaceholder="Search by discrepancy ID, asset, branch, or description…"
      filters={filterFields}
      onResetFilters={() => {
        setStatusFilter('');
        setTypeFilter('');
        setPriorityFilter('');
        query.reset();
      }}
      columns={[
        { key: 'code', header: 'ID', render: (row) => <span className="font-semibold">{row.code}</span> },
        {
          key: 'asset',
          header: 'Asset',
          render: (row) => (
            <div>
              <div className="font-medium">{row.asset_name}</div>
              <div className="text-xs text-muted-foreground">{row.asset_code}</div>
            </div>
          ),
        },
        { key: 'branch', header: 'Branch', render: (row) => row.branch_name },
        {
          key: 'type',
          header: 'Type',
          render: (row) => <StatusChip label={labelFrom(DISCREPANCY_TYPES, row.type, row.type)} tone="blue" />,
        },
        {
          key: 'priority',
          header: 'Priority',
          render: (row) => <StatusChip label={row.priority} tone={statusToneFromValue(row.priority)} />,
        },
        {
          key: 'status',
          header: 'Status',
          render: (row) => (
            <StatusChip label={labelFrom(DISCREPANCY_STATUSES, row.status, row.status)} tone={statusToneFromValue(row.status)} />
          ),
        },
        { key: 'reporter', header: 'Reported by', render: (row) => row.reported_by_name || '—' },
        { key: 'date', header: 'Reported', render: (row) => shortDate(row.reported_at) },
        { key: 'reviewer', header: 'Reviewer', render: (row) => row.assigned_reviewer_name || 'Unassigned' },
        {
          key: 'actions',
          header: '',
          align: 'right',
          render: (row) => (
            <button
              type="button"
              onClick={() => router.push(`/inventory/verification/discrepancies/${row.id}`)}
              className="text-xs font-semibold text-[#2f6fd0] hover:underline dark:text-[#88b6ff]"
            >
              Investigate
            </button>
          ),
        },
      ]}
      rows={query.rows as unknown as Discrepancy[]}
      rowKey={(row) => row.id}
      loading={loading}
      emptyMessage="No discrepancies match these filters."
      page={query.page}
      perPage={query.perPage}
      total={query.total}
      onPageChange={query.setPage}
      onPerPageChange={query.setPerPage}
    >
      <VerificationTabs />
      {error && <ErrorBanner message={error} />}
    </ListPageShell>
  );
}
