'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import {
  ErrorBanner,
  ListPageShell,
  PortButton,
  PriceText,
  StatCard,
  StatusChip,
} from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';
import { downloadCsv } from '@/lib/csv';
import { downloadFile } from '@/lib/download';

type Item = {
  id: string;
  bin_card_number: string;
  item_name: string;
  unit_label: string;
  quantity: number;
  min_quantity: number;
  unit_price: number;
  total_price: number;
  qty_level: 'below' | 'at' | 'comfortable';
};

type Settings = { currency: string };

const LEVEL_TONE = { below: 'gold', at: 'blue', comfortable: 'green' } as const;
const LEVEL_LABEL = { below: 'Below min', at: 'At min', comfortable: 'Above min' } as const;

export default function StockBalancesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemRes, settingsRes] = await Promise.all([
        fetch('/api/inventory/items'),
        fetch('/api/inventory/settings'),
      ]);
      const itemData = await itemRes.json();
      const settingsData = await settingsRes.json().catch(() => null);
      if (!itemRes.ok) throw new Error(itemData.error || 'Failed to load stock balances');
      setItems(Array.isArray(itemData) ? itemData : []);
      setSettings(settingsRes.ok && settingsData ? settingsData : null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stock balances');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filterFn = useCallback(
    (row: Item) => (levelFilter ? row.qty_level === levelFilter : true),
    [levelFilter]
  );

  const list = useListQuery({
    items: items as (Item & Record<string, unknown>)[],
    searchKeys: ['item_name', 'bin_card_number', 'unit_label'],
    filterKey: levelFilter,
    filterFn: filterFn as (row: Item & Record<string, unknown>) => boolean,
  });

  const totals = useMemo(() => {
    const rows = list.filtered as Item[];
    return {
      quantity: rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
      value: rows.reduce((sum, row) => sum + Number(row.total_price || 0), 0),
      low: rows.filter((row) => row.qty_level !== 'comfortable').length,
    };
  }, [list.filtered]);

  const currency = settings?.currency ? ` (${settings.currency})` : '';

  const exportCsv = () => {
    downloadCsv(
      `stock-balances-${new Date().toISOString().slice(0, 10)}`,
      list.filtered as Item[],
      [
        { header: 'Bin card', value: (row) => row.bin_card_number },
        { header: 'Item', value: (row) => row.item_name },
        { header: 'Unit', value: (row) => row.unit_label },
        { header: 'On hand', value: (row) => row.quantity },
        { header: 'Minimum', value: (row) => row.min_quantity },
        { header: 'Unit price', value: (row) => row.unit_price },
        { header: 'Balance value', value: (row) => row.total_price },
      ]
    );
  };

  return (
    <>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <ListPageShell
        title="Stock Balances"
        description="On-hand quantity and value for every stock item, with minimum-level flags."
        loading={loading}
        secondaryActions={
          <>
            <PortButton
              variant="primary"
              onClick={() => downloadFile('/api/inventory/export?type=items&format=xlsx')}
            >
              <Download size={16} /> Excel
            </PortButton>
            <PortButton onClick={exportCsv}>
              <FileText size={16} /> CSV
            </PortButton>
          </>
        }
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search item, bin card, or unit…"
        filters={[
          {
            key: 'level',
            label: 'Quantity level',
            value: levelFilter,
            onChange: setLevelFilter,
            options: [
              { value: 'below', label: 'Below minimum' },
              { value: 'at', label: 'At minimum' },
              { value: 'comfortable', label: 'Above minimum' },
            ],
          },
        ]}
        onResetFilters={() => {
          setLevelFilter('');
          list.reset();
        }}
        columns={[
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
          { key: 'unit_label', header: 'Unit', render: (row) => row.unit_label || '—' },
          { key: 'quantity', header: 'On hand' },
          { key: 'min_quantity', header: 'Minimum' },
          {
            key: 'qty_level',
            header: 'Level',
            render: (row) => (
              <StatusChip tone={LEVEL_TONE[row.qty_level]} label={LEVEL_LABEL[row.qty_level]} />
            ),
          },
          {
            key: 'unit_price',
            header: `Unit price${currency}`,
            align: 'right',
            render: (row) => <PriceText value={row.unit_price} />,
          },
          {
            key: 'total_price',
            header: `Balance value${currency}`,
            align: 'right',
            render: (row) => <PriceText value={row.total_price} />,
          },
        ]}
        rows={list.rows}
        rowKey={(row) => String(row.id)}
        emptyMessage="No stock items match this filter."
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Items in view" value={list.total} accent="blue" />
          <StatCard label="Total quantity" value={totals.quantity} accent="green" />
          <StatCard
            label="Stock value"
            value={<PriceText value={Math.round(totals.value * 100) / 100} currency={settings?.currency} />}
            accent="purple"
          />
          <StatCard label="Low stock" value={totals.low} accent="gold" />
        </div>
      </ListPageShell>
    </>
  );
}
