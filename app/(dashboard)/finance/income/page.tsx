'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorBanner, ListPageShell, StatCard, StatusChip, statusToneFromValue } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { daysAgo } from '@/components/dashboards/DateFilterBar';
import { dateLabel, money } from '@/lib/display';

type IncomeRow = {
  id: string;
  reference: string;
  studentName: string;
  studentCode: string | null;
  amount: number;
  method: string;
  type: string;
  referenceNumber: string | null;
  date: string | null;
  status: string;
  notes: string | null;
};

type MonthRow = { key: string; label: string; income: number };
type Summary = { total: number; thisMonth: number; average: number; entries: number };

export default function IncomePage() {
  const [rows, setRows] = useState<IncomeRow[]>([]);
  const [months, setMonths] = useState<MonthRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState(daysAgo(89));
  const [to, setTo] = useState(daysAgo(0));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/finance/income');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load income');
        if (!cancelled) {
          setRows(Array.isArray(data.rows) ? data.rows : []);
          setMonths(Array.isArray(data.months) ? data.months : []);
          setSummary(data.summary ?? null);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load income';
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
    (row: IncomeRow) => {
      const date = String(row.date ?? '').slice(0, 10);
      return (
        (!method || row.method === method) &&
        (!type || row.type === type) &&
        (!status || row.status === status) &&
        (!from || !date || date >= from) &&
        (!to || !date || date <= to)
      );
    },
    [method, type, status, from, to]
  );

  const list = useListQuery({
    items: rows as (IncomeRow & Record<string, unknown>)[],
    searchKeys: ['reference', 'studentName', 'studentCode', 'referenceNumber', 'type'],
    filterKey: `${method}|${type}|${status}|${from}|${to}`,
    filterFn: filterFn as (row: IncomeRow & Record<string, unknown>) => boolean,
  });

  const methodOptions = useMemo(() => {
    const set = new Set(rows.map((row) => row.method).filter(Boolean));
    return [...set].map((value) => ({ value, label: value.replaceAll('_', ' ') }));
  }, [rows]);

  const typeOptions = useMemo(() => {
    const set = new Set(rows.map((row) => row.type).filter(Boolean));
    return [...set].map((value) => ({ value, label: value }));
  }, [rows]);

  const maxMonth = Math.max(1, ...months.map((month) => month.income));

  return (
    <ListPageShell
      title="Income"
      description="Fee collections and other recorded receipts"
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search reference, student, or type…"
      dateFrom={from}
      dateTo={to}
      onDateRangeChange={({ from: nextFrom, to: nextTo }) => {
        setFrom(nextFrom);
        setTo(nextTo);
      }}
      onResetFilters={() => {
        list.reset();
        setMethod('');
        setType('');
        setStatus('');
        setFrom(daysAgo(89));
        setTo(daysAgo(0));
      }}
      filters={[
        {
          key: 'method',
          label: 'Method',
          value: method,
          options: methodOptions,
          onChange: setMethod,
        },
        {
          key: 'type',
          label: 'Income type',
          value: type,
          options: typeOptions,
          onChange: setType,
        },
        {
          key: 'status',
          label: 'Status',
          value: status,
          options: [
            { value: 'completed', label: 'Completed' },
            { value: 'pending', label: 'Pending' },
            { value: 'refunded', label: 'Refunded' },
          ],
          onChange: setStatus,
        },
      ]}
      loading={loading}
      columns={[
        {
          key: 'reference',
          header: 'Receipt',
          render: (row) => (
            <div>
              <div className="font-semibold">{row.reference}</div>
              {row.referenceNumber && (
                <div className="text-xs text-muted-foreground">{row.referenceNumber}</div>
              )}
            </div>
          ),
        },
        {
          key: 'studentName',
          header: 'Payer',
          render: (row) => (
            <div>
              <div>{row.studentName}</div>
              {row.studentCode && <div className="text-xs text-muted-foreground">{row.studentCode}</div>}
            </div>
          ),
        },
        {
          key: 'amount',
          header: 'Amount',
          align: 'right',
          render: (row) => <span className="font-semibold">{money(row.amount)}</span>,
        },
        { key: 'method', header: 'Method', render: (row) => row.method.replaceAll('_', ' ') },
        { key: 'type', header: 'Type' },
        { key: 'date', header: 'Date', render: (row) => dateLabel(row.date) },
        {
          key: 'status',
          header: 'Status',
          render: (row) => <StatusChip label={row.status} tone={statusToneFromValue(row.status)} />,
        },
      ]}
      rows={list.rows as IncomeRow[]}
      rowKey={(row) => row.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No income recorded in this period."
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total income" value={money(summary?.total ?? 0)} accent="green" />
        <StatCard label="This month" value={money(summary?.thisMonth ?? 0)} accent="blue" />
        <StatCard label="Average receipt" value={money(summary?.average ?? 0)} accent="purple" />
        <StatCard label="Receipts" value={summary?.entries ?? 0} accent="gold" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Last 6 months
        </p>
        <div className="mt-3 grid grid-cols-6 gap-2">
          {months.map((month) => (
            <div key={month.key} className="text-center">
              <div className="flex h-24 items-end justify-center">
                <div
                  className="w-6 rounded-t bg-emerald-400/80"
                  style={{ height: `${Math.max(4, (month.income / maxMonth) * 100)}%` }}
                  title={money(month.income)}
                />
              </div>
              <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{month.label}</p>
            </div>
          ))}
        </div>
      </div>

      {error && <ErrorBanner message={error} />}
    </ListPageShell>
  );
}
