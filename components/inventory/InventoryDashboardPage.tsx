'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DashboardAreaChart,
  DashboardBarChart,
  DashboardPieChart,
} from '@/components/dashboards/DashboardCharts';
import type { ChartConfig } from '@/components/ui/chart';
import { ErrorBanner, PageHeader, PortButton, StatCard } from '@/components/ports';

type Counted = { name: string; count: number };

type Dashboard = {
  headlines: {
    inventory_items: number;
    total_on_hand: number;
    items_at_or_below_minimum: number;
    movements_last_30_days: number;
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/dashboard');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load the inventory dashboard');
      setData(body);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the inventory dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

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
          </div>
        }
      />
      {error && <ErrorBanner message={error} />}

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
          label="Movements (30 days)"
          value={value(h?.movements_last_30_days)}
          hint="Stock in and out"
          accent="purple"
        />
        <StatCard
          label="Registered assets"
          value={value(data?.assets.registered_assets)}
          hint="Fixed assets, not in trash"
          accent="blue"
        />
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
            description="In vs out transaction counts by month (last six months)."
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
