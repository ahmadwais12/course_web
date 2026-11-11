'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBanner, ListPageShell, StatCard, StatusChip, statusToneFromValue } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { dateLabel, money } from '@/lib/display';

type VoucherRow = {
  id: string;
  voucherNo: string;
  type: 'receipt' | 'payment' | 'journal';
  date: string | null;
  party: string;
  description: string;
  amount: number;
  method: string | null;
  status: string;
};

type Summary = {
  receipts: number;
  receiptValue: number;
  payments: number;
  paymentValue: number;
  journals: number;
};

const TYPE_LABEL: Record<VoucherRow['type'], string> = {
  receipt: 'Receipt voucher',
  payment: 'Payment voucher',
  journal: 'Journal voucher',
};

export default function VouchersPage() {
  const [rows, setRows] = useState<VoucherRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/finance/vouchers');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load vouchers');
        if (!cancelled) {
          setRows(Array.isArray(data.rows) ? data.rows : []);
          setSummary(data.summary ?? null);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load vouchers';
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
    (row: VoucherRow) =>
      (!type || row.type === type) && (!status || row.status === status),
    [type, status]
  );

  const list = useListQuery({
    items: rows as (VoucherRow & Record<string, unknown>)[],
    searchKeys: ['voucherNo', 'party', 'description', 'method'],
    filterKey: `${type}|${status}`,
    filterFn: filterFn as (row: VoucherRow & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(() => {
    const set = new Set(rows.map((row) => row.status).filter(Boolean));
    return [...set].map((value) => ({ value, label: value }));
  }, [rows]);

  return (
    <ListPageShell
      title="Vouchers"
      description="Receipt, payment, and journal vouchers in one register"
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search voucher number, party, or description…"
      onResetFilters={() => {
        list.reset();
        setType('');
        setStatus('');
      }}
      filters={[
        {
          key: 'type',
          label: 'Voucher type',
          value: type,
          options: [
            { value: 'receipt', label: 'Receipts' },
            { value: 'payment', label: 'Payments' },
            { value: 'journal', label: 'Journals' },
          ],
          onChange: setType,
        },
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
          key: 'voucherNo',
          header: 'Voucher',
          render: (row) => (
            <div>
              <div className="font-semibold">{row.voucherNo}</div>
              <div className="text-xs text-muted-foreground">{TYPE_LABEL[row.type]}</div>
            </div>
          ),
        },
        { key: 'date', header: 'Date', render: (row) => dateLabel(row.date) },
        { key: 'party', header: 'Party' },
        {
          key: 'description',
          header: 'Description',
          render: (row) => (
            <span className="block max-w-[240px] truncate" title={row.description}>
              {row.description || '—'}
            </span>
          ),
        },
        {
          key: 'amount',
          header: 'Amount',
          align: 'right',
          render: (row) => (
            <span
              className={
                row.type === 'payment'
                  ? 'font-semibold text-rose-600 dark:text-rose-300'
                  : 'font-semibold text-emerald-600 dark:text-emerald-300'
              }
            >
              {row.type === 'payment' ? '−' : '+'}
              {money(row.amount)}
            </span>
          ),
        },
        {
          key: 'method',
          header: 'Method',
          render: (row) => (row.method ? row.method.replaceAll('_', ' ') : '—'),
        },
        {
          key: 'status',
          header: 'Status',
          render: (row) => <StatusChip label={row.status} tone={statusToneFromValue(row.status)} />,
        },
      ]}
      rows={list.rows as VoucherRow[]}
      rowKey={(row) => row.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No vouchers recorded yet."
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Receipts"
          value={money(summary?.receiptValue ?? 0)}
          hint={summary ? `${summary.receipts} vouchers` : undefined}
          accent="green"
        />
        <StatCard
          label="Payments"
          value={money(summary?.paymentValue ?? 0)}
          hint={summary ? `${summary.payments} vouchers` : undefined}
          accent="gold"
        />
        <StatCard label="Journal vouchers" value={summary?.journals ?? 0} accent="purple" />
        <StatCard
          label="Net movement"
          value={money((summary?.receiptValue ?? 0) - (summary?.paymentValue ?? 0))}
          accent="blue"
        />
      </div>
      {error && <ErrorBanner message={error} />}
    </ListPageShell>
  );
}
