'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DashboardBarChart,
  DashboardPieChart,
} from '@/components/dashboards/DashboardCharts';
import {
  ErrorBanner,
  ListPageShell,
  PortButton,
  SegmentedControl,
  StatCard,
  StatusChip,
  statusToneFromValue,
} from '@/components/ports';
import type { DataColumn, ListFilter } from '@/components/ports';
import type { ChartConfig } from '@/components/ui/chart';
import { useListQuery } from '@/hooks/useListQuery';
import { money } from '@/lib/display';
import { toast } from '@/components/ui/Toast';

type Tab = 'assets' | 'stock' | 'purchases';

type AssetTableRow = {
  id: string;
  tagNumber: string;
  name: string;
  category: string;
  department: string;
  location: string;
  status: string;
  currency: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  accumulated: number;
  bookValue: number;
  depreciable: boolean;
  fullyDepreciated: boolean;
  invoiceDate: string;
  discovered: boolean;
};

type StockTableRow = {
  id: string;
  binCard: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  value: number;
  minQuantity: number;
  qtyLevel: string;
};

type PurchaseTableRow = {
  id: string;
  reference: string;
  supplier: string;
  item: string;
  quantity: number;
  unitPrice: number;
  value: number;
  status: string;
  date: string;
  receivedDate: string;
};

type Data = {
  currency: string;
  primaryCurrency: string;
  currencies: { currency: string; count: number; cost: number; accumulated: number; bookValue: number }[];
  assets: {
    registered: number;
    depreciable: number;
    fullyDepreciated: number;
    cost: number;
    accumulated: number;
    bookValue: number;
    discovered: number;
    discoveredValue: number;
  };
  stock: { items: number; units: number; value: number; lowStock: number; outOfStock: number };
  purchases: {
    receivedCount: number;
    receivedValue: number;
    orderedCount: number;
    orderedValue: number;
    draftCount: number;
    cancelledCount: number;
  };
  departments: { name: string; value: number }[];
  topStock: { name: string; value: number }[];
  assetRows: AssetTableRow[];
  otherCurrencyAssets: boolean;
  stockRows: StockTableRow[];
  purchaseRows: PurchaseTableRow[];
};

const PALETTE = ['#88b6ff', '#4fc3a1', '#f4b740', '#8f7cf0', '#ef6b6b', '#91a0b0', '#e07ab5'];
const PURCHASE_STATUSES = ['draft', 'ordered', 'received', 'cancelled'];

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateLabel(value: string) {
  if (!value) return '—';
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.valueOf())
    ? value
    : parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function FinanceAssetsInventoryPage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('assets');
  const [assetStatus, setAssetStatus] = useState('');
  const [stockLevel, setStockLevel] = useState('');
  const [purchaseStatus, setPurchaseStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(
        `/api/finance/assets-inventory${params.toString() ? `?${params.toString()}` : ''}`,
        { cache: 'no-store' }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load assets and inventory valuation');
      setData(body);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load assets and inventory valuation';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const assetStatuses = useMemo(
    () => [...new Set((data?.assetRows ?? []).map((row) => row.status))].sort(),
    [data]
  );

  const assetList = useListQuery({
    items: (data?.assetRows ?? []) as (AssetTableRow & Record<string, unknown>)[],
    searchKeys: ['name', 'tagNumber', 'category', 'department', 'location'],
    filterKey: `assets|${assetStatus}`,
    filterFn: (row) => !assetStatus || row.status === assetStatus,
  });

  const stockList = useListQuery({
    items: (data?.stockRows ?? []) as (StockTableRow & Record<string, unknown>)[],
    searchKeys: ['name', 'binCard', 'unit'],
    filterKey: `stock|${stockLevel}`,
    filterFn: (row) =>
      !stockLevel ||
      (stockLevel === 'low' ? row.qtyLevel === 'below' : stockLevel === 'at' ? row.qtyLevel === 'at' : row.qtyLevel === 'comfortable'),
  });

  const purchaseList = useListQuery({
    items: (data?.purchaseRows ?? []) as (PurchaseTableRow & Record<string, unknown>)[],
    searchKeys: ['reference', 'supplier', 'item'],
    filterKey: `purchases|${purchaseStatus}`,
    filterFn: (row) => !purchaseStatus || row.status === purchaseStatus,
  });

  const currency = data?.primaryCurrency ?? 'AFN';
  const stockCurrency = data?.currency ?? 'AFN';

  const departmentChart = useMemo(() => {
    const rows = (data?.departments ?? []).slice(0, 5);
    return rows.map((row, index) => ({ ...row, fill: PALETTE[index % PALETTE.length] }));
  }, [data]);

  const departmentConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const row of departmentChart) {
      config[row.name] = { label: row.name, color: row.fill };
    }
    return config;
  }, [departmentChart]);

  const stockConfig = {
    value: { label: 'Stock value', color: 'var(--chart-2)' },
  } satisfies ChartConfig;

  const columns: DataColumn<Record<string, unknown>>[] =
    tab === 'assets'
      ? [
          {
            key: 'tagNumber',
            header: 'Tag',
            render: (row) => (
              <button
                type="button"
                className="font-medium text-sky-600 hover:underline dark:text-sky-400"
                onClick={() => router.push('/inventory/assets')}
              >
                {String(row.tagNumber)}
              </button>
            ),
          },
          { key: 'name', header: 'Asset' },
          { key: 'category', header: 'Category' },
          { key: 'department', header: 'Department' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusChip label={String(row.status)} tone={statusToneFromValue(String(row.status))} />
            ),
          },
          {
            key: 'totalCost',
            header: 'Cost',
            align: 'right',
            render: (row) => money(Number(row.totalCost), String(row.currency)),
          },
          {
            key: 'accumulated',
            header: 'Accumulated dep.',
            align: 'right',
            render: (row) => money(Number(row.accumulated), String(row.currency)),
          },
          {
            key: 'bookValue',
            header: 'Book value',
            align: 'right',
            render: (row) => money(Number(row.bookValue), String(row.currency)),
          },
          {
            key: 'discovered',
            header: 'Source',
            render: (row) =>
              row.discovered ? (
                <StatusChip label="verification" tone="purple" />
              ) : (
                <span className="text-xs text-muted-foreground">register</span>
              ),
          },
        ]
      : tab === 'stock'
        ? [
            { key: 'binCard', header: 'Bin card' },
            { key: 'name', header: 'Item' },
            { key: 'unit', header: 'Unit' },
            {
              key: 'quantity',
              header: 'On hand',
              align: 'right',
              render: (row) => Number(row.quantity).toLocaleString('en-US'),
            },
            {
              key: 'minQuantity',
              header: 'Minimum',
              align: 'right',
              render: (row) => Number(row.minQuantity).toLocaleString('en-US'),
            },
            { key: 'unitPrice', header: 'Unit price', align: 'right', render: (row) => money(Number(row.unitPrice), stockCurrency) },
            { key: 'value', header: 'Stock value', align: 'right', render: (row) => money(Number(row.value), stockCurrency) },
            {
              key: 'qtyLevel',
              header: 'Level',
              render: (row) => (
                <StatusChip
                  label={readable(String(row.qtyLevel))}
                  tone={row.qtyLevel === 'below' ? 'gold' : row.qtyLevel === 'at' ? 'blue' : 'green'}
                />
              ),
            },
          ]
        : [
            { key: 'reference', header: 'Reference' },
            { key: 'supplier', header: 'Supplier' },
            { key: 'item', header: 'Item' },
            {
              key: 'quantity',
              header: 'Qty',
              align: 'right',
              render: (row) => Number(row.quantity).toLocaleString('en-US'),
            },
            {
              key: 'value',
              header: 'Purchase value',
              align: 'right',
              render: (row) => money(Number(row.value), stockCurrency),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <StatusChip label={readable(String(row.status))} tone={statusToneFromValue(String(row.status))} />
              ),
            },
            { key: 'date', header: 'Date', render: (row) => dateLabel(String(row.date ?? '')) },
            {
              key: 'receivedDate',
              header: 'Received',
              render: (row) => dateLabel(String(row.receivedDate ?? '')),
            },
          ];

  const filters: ListFilter[] =
    tab === 'assets'
      ? [
          {
            key: 'status',
            label: 'Asset status',
            value: assetStatus,
            onChange: setAssetStatus,
            options: assetStatuses.map((value) => ({ value, label: value })),
          },
        ]
      : tab === 'stock'
        ? [
            {
              key: 'level',
              label: 'Stock level',
              value: stockLevel,
              onChange: setStockLevel,
              options: [
                { value: 'low', label: 'Below minimum' },
                { value: 'at', label: 'At minimum' },
                { value: 'comfortable', label: 'Healthy' },
              ],
            },
          ]
        : [
            {
              key: 'status',
              label: 'Purchase status',
              value: purchaseStatus,
              onChange: setPurchaseStatus,
              options: PURCHASE_STATUSES.map((value) => ({ value, label: readable(value) })),
            },
          ];

  const activeList = tab === 'assets' ? assetList : tab === 'stock' ? stockList : purchaseList;
  const activeRows = activeList.rows as Record<string, unknown>[];

  return (
    <ListPageShell
      title="Assets & Inventory"
      description="Fixed-asset register valuation, depreciation, stock value, and purchase commitments feeding the finance module."
      pill={loading ? 'LOADING…' : 'LIVE DATA'}
      secondaryActions={
        <div className="flex flex-wrap items-center gap-2">
          <PortButton onClick={() => router.push('/inventory/assets')}>Asset register</PortButton>
          <PortButton onClick={() => router.push('/inventory/items')}>Stock items</PortButton>
          <PortButton onClick={() => router.push('/inventory/purchases')}>Purchases</PortButton>
        </div>
      }
      search={activeList.search}
      onSearchChange={activeList.setSearch}
      searchPlaceholder={
        tab === 'assets' ? 'Search asset, tag, category…' : tab === 'stock' ? 'Search item or bin card…' : 'Search purchase or supplier…'
      }
      filters={filters}
      onResetFilters={activeList.reset}
      dateFrom={tab === 'purchases' ? from : undefined}
      dateTo={tab === 'purchases' ? to : undefined}
      onDateRangeChange={
        tab === 'purchases'
          ? (next) => {
              setFrom(next.from);
              setTo(next.to);
            }
          : undefined
      }
      columns={columns}
      rows={activeRows}
      rowKey={(row) => String(row.id)}
      loading={loading}
      page={activeList.page}
      perPage={activeList.perPage}
      total={activeList.total}
      onPageChange={activeList.setPage}
      onPerPageChange={activeList.setPerPage}
      emptyMessage="No records match these filters."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Asset book value"
            value={money(data?.assets.bookValue ?? 0, currency)}
            hint={`${data?.assets.registered ?? 0} registered assets`}
            accent="blue"
          />
          <StatCard
            label="Accumulated depreciation"
            value={money(data?.assets.accumulated ?? 0, currency)}
            hint={`${data?.assets.fullyDepreciated ?? 0} fully depreciated`}
            accent="gold"
          />
          <StatCard
            label="Stock value"
            value={money(data?.stock.value ?? 0, stockCurrency)}
            hint={`${data?.stock.items ?? 0} items · ${(data?.stock.units ?? 0).toLocaleString('en-US')} units`}
            accent="green"
          />
          <StatCard
            label="Received purchases"
            value={money(data?.purchases.receivedValue ?? 0, stockCurrency)}
            hint={`${data?.purchases.receivedCount ?? 0} received orders`}
            accent="purple"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Assets discovered in verification"
            value={String(data?.assets.discovered ?? 0)}
            hint={`${money(data?.assets.discoveredValue ?? 0, currency)} at cost`}
            accent="purple"
          />
          <StatCard
            label="Low stock items"
            value={String(data?.stock.lowStock ?? 0)}
            hint={`${data?.stock.outOfStock ?? 0} out of stock`}
            accent="gold"
          />
          <StatCard
            label="Ordered (not received)"
            value={money(data?.purchases.orderedValue ?? 0, stockCurrency)}
            hint={`${data?.purchases.orderedCount ?? 0} open orders`}
            accent="blue"
          />
          <StatCard
            label="Asset cost"
            value={money(data?.assets.cost ?? 0, currency)}
            hint={
              data?.otherCurrencyAssets
                ? `Primary currency ${currency}; ${data?.currencies.length} currencies in register`
                : `Register valued in ${currency}`
            }
            accent="green"
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <DashboardPieChart
            title="Asset book value by department"
            description={`Net book value at cost in ${currency}`}
            data={departmentChart}
            config={departmentConfig}
          />
          <DashboardBarChart
            title="Highest-value stock items"
            description={`On-hand valuation in ${stockCurrency}`}
            data={data?.topStock ?? []}
            config={stockConfig}
            layout="horizontal"
          />
        </div>

        {data?.otherCurrencyAssets && (
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            {data.currencies
              .map(
                (row) =>
                  `${row.currency}: ${money(row.bookValue, row.currency)} book value (${row.count} assets)`
              )
              .join(' · ')}
          </div>
        )}

        <SegmentedControl
          value={tab}
          onChange={(value) => setTab(value as Tab)}
          options={[
            { value: 'assets', label: `Fixed assets (${data?.assets.registered ?? 0})` },
            { value: 'stock', label: `Stock (${data?.stock.items ?? 0})` },
            { value: 'purchases', label: `Purchases (${data?.purchaseRows.length ?? 0})` },
          ]}
        />
        {error && <ErrorBanner message={error} />}
      </div>
    </ListPageShell>
  );
}
