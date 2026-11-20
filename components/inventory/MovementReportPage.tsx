'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import {
  ErrorBanner,
  ListPageShell,
  PortButton,
  StatCard,
  StatusChip,
} from '@/components/ports';
import { downloadFile } from '@/lib/download';
import { useListQuery } from '@/hooks/useListQuery';

type Movement = {
  id: string;
  item_id: string;
  item_name: string;
  bin_card_number: string;
  transaction_type: 'in' | 'out';
  invoice_number: string;
  quantity: number;
  price: number;
  holder_name: string;
  department: string;
  location: string;
  transaction_description: string;
  transaction_date: string;
};

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function MovementReportPage() {
  const [rows, setRows] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState(defaultRange);
  const [typeFilter, setTypeFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/transactions');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load movements');
      setRows(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load movements');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const inRange = useMemo(
    () =>
      rows.filter((row) => {
        if (range.from && row.transaction_date < range.from) return false;
        if (range.to && row.transaction_date > range.to) return false;
        return true;
      }),
    [rows, range]
  );

  const filterFn = useCallback(
    (row: Movement) => {
      if (typeFilter && row.transaction_type !== typeFilter) return false;
      if (warehouseFilter && row.location !== warehouseFilter) return false;
      return true;
    },
    [typeFilter, warehouseFilter]
  );

  const list = useListQuery({
    items: inRange as (Movement & Record<string, unknown>)[],
    searchKeys: ['item_name', 'bin_card_number', 'invoice_number', 'holder_name', 'department', 'transaction_description'],
    filterKey: `${range.from}|${range.to}|${typeFilter}|${warehouseFilter}`,
    filterFn: filterFn as (row: Movement & Record<string, unknown>) => boolean,
  });

  const warehouses = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) if (row.location) set.add(row.location);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const totals = useMemo(() => {
    let stockIn = 0;
    let stockOut = 0;
    for (const row of list.filtered as Movement[]) {
      if (row.transaction_type === 'in') stockIn += row.quantity;
      else stockOut += row.quantity;
    }
    return { stockIn, stockOut, net: stockIn - stockOut };
  }, [list.filtered]);

  const exportReport = (format: 'xlsx' | 'csv') => {
    const params = new URLSearchParams({ type: 'movements', format });
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    downloadFile(`/api/inventory/export?${params.toString()}`);
  };

  return (
    <ListPageShell
      title="Movement Report"
      description="Every stock in and stock out record for the selected window, with quantities and destinations."
      pill="MOVEMENTS"
      loading={loading}
      secondaryActions={
        <>
          <PortButton variant="primary" onClick={() => exportReport('xlsx')}>
            <Download size={16} /> Excel
          </PortButton>
          <PortButton onClick={() => exportReport('csv')}>
            <FileText size={16} /> CSV
          </PortButton>
        </>
      }
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search item, invoice, holder, or department…"
      dateFrom={range.from}
      dateTo={range.to}
      onDateRangeChange={(next) => setRange({ from: next.from, to: next.to })}
      filters={[
        {
          key: 'type',
          label: 'Movement type',
          value: typeFilter,
          onChange: setTypeFilter,
          options: [
            { value: 'in', label: 'Stock in' },
            { value: 'out', label: 'Stock out' },
          ],
        },
        {
          key: 'warehouse',
          label: 'Warehouse',
          value: warehouseFilter,
          onChange: setWarehouseFilter,
          options: warehouses.map((value) => ({ value, label: value })),
        },
      ]}
      onResetFilters={() => {
        setTypeFilter('');
        setWarehouseFilter('');
        list.reset();
      }}
      columns={[
        { key: 'transaction_date', header: 'Date' },
        {
          key: 'transaction_type',
          header: 'Type',
          render: (row) => (
            <StatusChip
              tone={row.transaction_type === 'in' ? 'green' : 'gold'}
              label={row.transaction_type === 'in' ? 'In' : 'Out'}
            />
          ),
        },
        {
          key: 'item_name',
          header: 'Item',
          render: (row) => (
            <div>
              <div className="font-medium">{row.item_name}</div>
              <div className="text-xs text-muted-foreground">{row.bin_card_number || '—'}</div>
            </div>
          ),
        },
        { key: 'quantity', header: 'Quantity' },
        { key: 'holder_name', header: 'Holder', render: (row) => row.holder_name || '—' },
        { key: 'department', header: 'Department', render: (row) => row.department || '—' },
        { key: 'location', header: 'Warehouse', render: (row) => row.location || '—' },
        { key: 'invoice_number', header: 'Invoice', render: (row) => row.invoice_number || '—' },
      ]}
      rows={list.rows}
      rowKey={(row) => String(row.id)}
      emptyMessage="No movements recorded in this date range."
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
    >
      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Movements" value={list.total} accent="blue" />
        <StatCard label="Quantity in" value={totals.stockIn} accent="green" />
        <StatCard label="Quantity out" value={totals.stockOut} accent="gold" />
        <StatCard label="Net change" value={totals.net} accent="purple" />
      </div>
    </ListPageShell>
  );
}
