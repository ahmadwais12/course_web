'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBanner, ListPageShell, StatCard, StatusChip } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { dateLabel, money } from '@/lib/display';

type ExpiryState = 'active' | 'expiring' | 'expired' | 'open';

type ContractRow = {
  id: string;
  kind: 'staff' | 'teacher';
  employeeName: string;
  employeeCode: string | null;
  designation: string;
  department: string | null;
  contractType: string;
  joinDate: string | null;
  contractEndDate: string | null;
  salary: number;
  status: string;
  daysToExpiry: number | null;
  expiryState: ExpiryState;
};

type Summary = { total: number; expiring: number; expired: number; open: number };

const EXPIRY_LABEL: Record<ExpiryState, string> = {
  active: 'active',
  expiring: 'expiring soon',
  expired: 'expired',
  open: 'open-ended',
};

const EXPIRY_TONE: Record<ExpiryState, 'green' | 'gold' | 'purple' | 'blue'> = {
  active: 'green',
  expiring: 'gold',
  expired: 'purple',
  open: 'blue',
};

export default function HrContractsPage() {
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiry, setExpiry] = useState('');
  const [contractType, setContractType] = useState('');
  const [kind, setKind] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/hr/contracts');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load contracts');
        if (!cancelled) {
          setRows(Array.isArray(data.rows) ? data.rows : []);
          setSummary(data.summary ?? null);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load contracts';
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
    (row: ContractRow) =>
      (!expiry || row.expiryState === expiry) &&
      (!contractType || row.contractType === contractType) &&
      (!kind || row.kind === kind),
    [expiry, contractType, kind]
  );

  const list = useListQuery({
    items: rows as (ContractRow & Record<string, unknown>)[],
    searchKeys: ['employeeName', 'employeeCode', 'designation', 'department'],
    filterKey: `${expiry}|${contractType}|${kind}`,
    filterFn: filterFn as (row: ContractRow & Record<string, unknown>) => boolean,
  });

  const typeOptions = useMemo(() => {
    const set = new Set(rows.map((row) => row.contractType).filter(Boolean));
    return [...set].map((value) => ({ value, label: value }));
  }, [rows]);

  return (
    <ListPageShell
      title="Contracts"
      description="Employment contracts, renewal dates, and expiry risk"
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search employee, code, or department…"
      onResetFilters={() => {
        list.reset();
        setExpiry('');
        setContractType('');
        setKind('');
      }}
      filters={[
        {
          key: 'expiry',
          label: 'Contract state',
          value: expiry,
          options: [
            { value: 'expired', label: 'Expired' },
            { value: 'expiring', label: 'Expiring in 30 days' },
            { value: 'active', label: 'Active' },
            { value: 'open', label: 'Open-ended' },
          ],
          onChange: setExpiry,
        },
        {
          key: 'contract_type',
          label: 'Contract type',
          value: contractType,
          options: typeOptions,
          onChange: setContractType,
        },
        {
          key: 'kind',
          label: 'Employee type',
          value: kind,
          options: [
            { value: 'teacher', label: 'Teachers' },
            { value: 'staff', label: 'Staff' },
          ],
          onChange: setKind,
        },
      ]}
      loading={loading}
      columns={[
        {
          key: 'employeeName',
          header: 'Employee',
          render: (row) => (
            <div>
              <div className="font-semibold">{row.employeeName}</div>
              <div className="text-xs text-muted-foreground">
                {[row.employeeCode, row.kind === 'teacher' ? 'Teacher' : 'Staff']
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
          ),
        },
        { key: 'designation', header: 'Designation' },
        {
          key: 'department',
          header: 'Department',
          render: (row) => row.department || <span className="text-xs text-muted-foreground">—</span>,
        },
        { key: 'contractType', header: 'Type' },
        {
          key: 'joinDate',
          header: 'Started',
          render: (row) => dateLabel(row.joinDate),
        },
        {
          key: 'contractEndDate',
          header: 'Ends',
          render: (row) => dateLabel(row.contractEndDate),
        },
        {
          key: 'expiryState',
          header: 'Expiry',
          render: (row) => (
            <div className="space-y-1">
              <StatusChip label={EXPIRY_LABEL[row.expiryState]} tone={EXPIRY_TONE[row.expiryState]} />
              {row.daysToExpiry !== null && (
                <div className="text-[11px] text-muted-foreground">
                  {row.daysToExpiry < 0
                    ? `${Math.abs(row.daysToExpiry)} days ago`
                    : `${row.daysToExpiry} days left`}
                </div>
              )}
            </div>
          ),
        },
        {
          key: 'salary',
          header: 'Salary',
          align: 'right',
          render: (row) => (row.salary ? money(row.salary) : '—'),
        },
      ]}
      rows={list.rows as ContractRow[]}
      rowKey={(row) => `${row.kind}-${row.id}`}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No contracts recorded yet."
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Contracts" value={summary?.total ?? 0} accent="blue" />
        <StatCard label="Expiring in 30 days" value={summary?.expiring ?? 0} accent="gold" />
        <StatCard label="Expired" value={summary?.expired ?? 0} accent="purple" />
        <StatCard label="Open-ended" value={summary?.open ?? 0} accent="green" />
      </div>
      {error && <ErrorBanner message={error} />}
    </ListPageShell>
  );
}
