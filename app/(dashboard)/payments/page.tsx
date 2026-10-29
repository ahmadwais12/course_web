'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { ListPageShell, StatusChip, statusToneFromValue } from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';
import { daysAgo } from '@/components/dashboards/DateFilterBar';

type Payment = {
  id: string;
  payment_number?: string;
  amount?: number;
  payment_method?: string;
  payment_date?: string;
  payment_type?: string;
  status?: string;
};

export default function PaymentsPage() {
  const [items, setItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(daysAgo(0));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/payments');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load payments');
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          setItems([]);
          toast.error(e instanceof Error ? e.message : 'Failed to load payments');
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
    (item: Payment) => {
      const date = String(item.payment_date || '').slice(0, 10);
      return (
        (!status || item.status === status) &&
        (!method || item.payment_method === method) &&
        (!from || !date || date >= from) &&
        (!to || !date || date <= to)
      );
    },
    [status, method, from, to]
  );

  const list = useListQuery({
    items: items as (Payment & Record<string, unknown>)[],
    searchKeys: ['payment_number', 'payment_method', 'payment_type', 'status'],
    filterKey: `${status}|${method}|${from}|${to}`,
    filterFn: filterFn as (item: Payment & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.status).filter(Boolean) as string[]);
    return [...set].map((s) => ({ value: s, label: s }));
  }, [items]);

  const methodOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.payment_method).filter(Boolean) as string[]);
    return [...set].map((s) => ({ value: s, label: s }));
  }, [items]);

  return (
      <ListPageShell
        title="Payments"
        description="Fee payments with search, filters, and per-fetch pagination"
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search payment number, method…"
        dateFrom={from}
        dateTo={to}
        onDateRangeChange={({ from: nextFrom, to: nextTo }) => {
          setFrom(nextFrom);
          setTo(nextTo);
        }}
        onResetFilters={() => {
          list.reset();
          setStatus('');
          setMethod('');
          setFrom(daysAgo(29));
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
          {
            key: 'method',
            label: 'Method',
            value: method,
            options: methodOptions,
            onChange: setMethod,
          },
        ]}
        loading={loading}
        columns={[
          { key: 'payment_number', header: 'Number' },
          {
            key: 'amount',
            header: 'Amount',
            align: 'right',
            render: (r) => `$${Number(r.amount ?? 0).toLocaleString()}`,
          },
          { key: 'payment_method', header: 'Method' },
          { key: 'payment_type', header: 'Type' },
          { key: 'payment_date', header: 'Date' },
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
        rows={list.rows as Payment[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No payments found."
      />
  );
}
