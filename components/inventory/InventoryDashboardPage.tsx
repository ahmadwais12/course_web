'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DashboardAreaChart,
  DashboardBarChart,
  DashboardPieChart,
} from '@/components/dashboards/DashboardCharts';
import type { ChartConfig } from '@/components/ui/chart';
import { ErrorBanner, Filter, PageHeader, PortButton, StatCard } from '@/components/ports';
import { Download, FileSpreadsheet, FileText, RefreshCw } from 'lucide-react';
import { downloadFile } from '@/lib/download';
import type { SelectOption } from '@/components/ports';

type Counted = { name: string; count: number };

type Dashboard = {
  headlines: {
    inventory_items: number;
    total_on_hand: number;
    items_at_or_below_minimum: number;
    movements_last_30_days: number;
    movements_in_period: number;
  };
  stock_health: { comfortable: number; at_minimum: number; below_minimum: number };
  monthly_movements: { month: string; in: number; out: number }[];
  unit_mix: { unit: string; count: number }[];
  assets: {
    registered_assets: number;
    by_status: Counted[];
    by_department: Counted[];
    by_location: Counted[];
  };
  procurement: {
    purchase_orders: number;
    open_orders: number;
    received_value: number;
    suppliers: number;
    by_status: Counted[];
  };
  warehouse: { locations: number };
  filter_options: {
    stock_status: SelectOption[];
    asset_status: SelectOption[];
    departments: SelectOption[];
    locations: SelectOption[];
  };
};

const STOCK_CONFIG = {
  comfortable: { label: 'Comfortable', color: 'var(--chart-4)' },
  at_minimum: { label: 'At minimum', color: 'var(--chart-5)' },
  below_minimum: { label: 'Below minimum', color: '#ef6b6b' },
} satisfies ChartConfig;

const MOVEMENT_CONFIG = {
  in: { label: 'In', color: 'var(--chart-2)' },
  out: { label: 'Out', color: 'var(--chart-5)' },
} satisfies ChartConfig;

const UNIT_CONFIG = {
  count: { label: 'Items', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const ASSET_COUNT_CONFIG = {
  count: { label: 'Assets', color: 'var(--chart-3)' },
} satisfies ChartConfig;

const PURCHASE_CONFIG = {
  count: { label: 'Orders', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', '#91a0b0'];

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export default function InventoryDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [assetStatus, setAssetStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (stockStatus) params.set('stockStatus', stockStatus);
      if (assetStatus) params.set('assetStatus', assetStatus);
      if (department) params.set('department', department);
      if (location) params.set('location', location);
      const query = params.toString();
      const res = await fetch(`/api/inventory/dashboard${query ? `?${query}` : ''}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load the inventory dashboard');
      setData(body);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the inventory dashboard');
    } finally {
      setLoading(false);
    }
  }, [from, to, stockStatus, assetStatus, department, location]);

  useEffect(() => {
    load();
  }, [load]);

  const stockChart = useMemo(() => {
    if (!data) return [];
    return (Object.keys(STOCK_CONFIG) as (keyof typeof STOCK_CONFIG)[])
      .map((key) => ({ name: key, value: data.stock_health[key] }))
      .filter((row) => row.value > 0);
  }, [data]);

  const movementChart = useMemo(() => {
    const rows = data?.monthly_movements ?? [];
    if (!rows.some((row) => row.in > 0 || row.out > 0)) return [];
    return rows.map((row) => ({ name: monthLabel(row.month), in: row.in, out: row.out }));
  }, [data]);

  const unitChart = useMemo(
    () => (data?.unit_mix ?? []).slice(0, 8).map((row) => ({ name: row.unit, count: row.count })),
    [data]
  );

  // Status values are free text, so chart keys are generated and labels carry the real names.
  const { statusChart, statusConfig } = useMemo(() => {
    const rows = data?.assets.by_status ?? [];
    const config: ChartConfig = {};
    const chart = rows.map((row, index) => {
      const key = `status_${index}`;
      config[key] = { label: row.name, color: PALETTE[index % PALETTE.length] };
      return { name: key, value: row.count };
    });
    return { statusChart: chart, statusConfig: config };
  }, [data]);

  const departmentChart = useMemo(
    () => (data?.assets.by_department ?? []).map((row) => ({ label: row.name, count: row.count })),
    [data]
  );
  const locationChart = useMemo(
    () => (data?.assets.by_location ?? []).map((row) => ({ label: row.name, count: row.count })),
    [data]
  );
  const purchaseChart = useMemo(
    () => (data?.procurement.by_status ?? []).map((row) => ({ name: row.name, count: row.count })),
    [data]
  );

  const filterFields = useMemo(() => [
    { key: 'stockStatus', label: 'Stock health', value: stockStatus, options: data?.filter_options.stock_status ?? [], onChange: setStockStatus, placeholder: 'All stock levels' },
    { key: 'assetStatus', label: 'Asset status', value: assetStatus, options: data?.filter_options.asset_status ?? [], onChange: setAssetStatus, placeholder: 'All asset statuses' },
    { key: 'department', label: 'Department', value: department, options: data?.filter_options.departments ?? [], onChange: setDepartment, placeholder: 'All departments' },
    { key: 'location', label: 'Asset location', value: location, options: data?.filter_options.locations ?? [], onChange: setLocation, placeholder: 'All locations' },
  ], [stockStatus, assetStatus, department, location, data]);

  const resetFilters = () => {
    setFrom('');
    setTo('');
    setStockStatus('');
    setAssetStatus('');
    setDepartment('');
    setLocation('');
  };

  const exportDashboard = (format: 'pdf' | 'xlsx' | 'csv') => {
    const params = new URLSearchParams({ format });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (stockStatus) params.set('stockStatus', stockStatus);
    if (assetStatus) params.set('assetStatus', assetStatus);
    if (department) params.set('department', department);
    if (location) params.set('location', location);
    downloadFile(`/api/inventory/dashboard/export?${params.toString()}`);
  };

  const h = data?.headlines;
  const value = (n: number | undefined) => (n == null ? '—' : n.toLocaleString());

  return (
    <div className="min-w-0 space-y-4 animate-fade-up">
      <PageHeader
        title="Inventory Dashboard"
        description="High-level view of inventory and assets for your organization."
        pill={loading ? 'LOADING…' : 'LIVE DATA'}
        pillTone={loading ? 'neutral' : 'live'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PortButton onClick={() => router.push('/inventory/assets')}>Assets</PortButton>
            <PortButton variant="primary" onClick={() => router.push('/inventory/items')}>
              Inventory items
            </PortButton>
            <PortButton onClick={() => router.push('/inventory/purchases')}>Procurement</PortButton>
            <PortButton onClick={() => router.push('/inventory/warehouses')}>Warehouses</PortButton>
            <PortButton onClick={() => exportDashboard('pdf')}><FileText size={15} /> PDF</PortButton>
            <PortButton onClick={() => exportDashboard('xlsx')}><FileSpreadsheet size={15} /> Excel</PortButton>
            <PortButton onClick={() => exportDashboard('csv')}><Download size={15} /> CSV</PortButton>
          </div>
        }
      />
      {error && <ErrorBanner message={error} />}

      <Filter
        filters={filterFields}
        dateFrom={from}
        dateTo={to}
        onDateRangeChange={({ from: nextFrom, to: nextTo }) => { setFrom(nextFrom); setTo(nextTo); }}
        onReset={resetFilters}
        title="Inventory dashboard filters"
        description="Filter stock health and asset summaries. Date range applies to purchasing and stock movement activity."
        actions={<PortButton variant="ghost" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</PortButton>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Inventory items" value={value(h?.inventory_items)} hint="Stock item records" accent="blue" />
        <StatCard label="Total on hand" value={value(h?.total_on_hand)} hint="Sum of item quantities" accent="green" />
        <StatCard
          label="At or below minimum"
          value={value(h?.items_at_or_below_minimum)}
          hint="Items to reorder"
          accent="gold"
        />
        <StatCard
          label="Stock movements"
          value={value(h?.movements_in_period)}
          hint={from || to ? 'Selected date range' : 'Last 30 days'}
          accent="purple"
        />
        <StatCard
          label="Registered assets"
          value={value(data?.assets.registered_assets)}
          hint="Fixed assets, not in trash"
          accent="blue"
        />
        <StatCard label="Purchase orders" value={value(data?.procurement.purchase_orders)} hint="In selected period" accent="purple" />
        <StatCard label="Open purchase orders" value={value(data?.procurement.open_orders)} hint="Draft or ordered" accent="gold" />
        <StatCard label="Received purchase value" value={value(data?.procurement.received_value)} hint="Received in selected period" accent="green" />
        <StatCard label="Suppliers" value={value(data?.procurement.suppliers)} hint="Registered suppliers" accent="blue" />
        <StatCard label="Warehouses" value={value(data?.warehouse.locations)} hint="Warehouse locations" accent="purple" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardPieChart
          title="Stock levels overview"
          description="How item counts are distributed relative to minimum stock rules."
          data={stockChart}
          config={STOCK_CONFIG}
        />
        <div className="min-w-0 lg:col-span-2">
          <DashboardBarChart
            title="Movement trend"
            description={from || to ? 'In vs out transaction counts for the selected activity range.' : 'In vs out transaction counts for the last six months.'}
            data={movementChart}
            config={MOVEMENT_CONFIG}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardBarChart
          title="Unit mix"
          description="Top unit types by number of inventory records."
          data={unitChart}
          config={UNIT_CONFIG}
        />
        <DashboardPieChart
          title="Asset status"
          description="Registered assets grouped by status."
          data={statusChart}
          config={statusConfig}
        />
      </div>

      <DashboardBarChart
        title="Procurement status"
        description="Purchase orders grouped by status in the selected date range."
        data={purchaseChart}
        config={PURCHASE_CONFIG}
      />

      <DashboardAreaChart
        title="Assets by department"
        description="All departments by asset count, highest first."
        data={departmentChart}
        config={ASSET_COUNT_CONFIG}
      />
      <DashboardAreaChart
        title="Assets by location"
        description="All locations by asset count, highest first."
        data={locationChart}
        config={ASSET_COUNT_CONFIG}
      />
    </div>
  );
}
