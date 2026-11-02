'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardBarChart, DashboardPieChart } from '@/components/dashboards/DashboardCharts';
import type { ChartConfig } from '@/components/ui/chart';
import {
  DataTable,
  ErrorBanner,
  PageHeader,
  PortButton,
  StatusChip,
  statusToneFromValue,
  StatCard,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import type { BusinessRow } from '@/lib/business';
import { businessStatusFromRow } from '@/lib/business';
import { publicBusinessPath } from '@/lib/business-url';

const PLAN_CONFIG = {
  count: { label: 'Businesses', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'var(--chart-5)' },
  active: { label: 'Active', color: 'var(--chart-4)' },
  inactive: { label: 'Inactive', color: '#91a0b0' },
} satisfies ChartConfig;

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [items, setItems] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/businesses?type=central')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load businesses');
        setItems(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load businesses';
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, []);

  const statusCounts = useMemo(() => {
    const counts = { pending: 0, active: 0, inactive: 0 };
    for (const item of items) {
      const status = businessStatusFromRow(item);
      if (status in counts) counts[status as keyof typeof counts] += 1;
    }
    return counts;
  }, [items]);

  const planChart = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const plan = (item.plan || 'standard').toLowerCase();
      map.set(plan, (map.get(plan) || 0) + 1);
    }
    return [...map.entries()].map(([name, count]) => ({ name, count }));
  }, [items]);

  const statusChart = [
    { name: 'pending', value: statusCounts.pending, fill: 'var(--color-pending)' },
    { name: 'active', value: statusCounts.active, fill: 'var(--color-active)' },
    { name: 'inactive', value: statusCounts.inactive, fill: 'var(--color-inactive)' },
  ].filter((row) => row.value > 0);

  return (
    <div className="space-y-4 animate-fade-up">
      <PageHeader
        title="Platform Dashboard"
        description="All businesses, plans, and public sites across DreamFlow."
        pill={loading ? 'LOADING…' : 'LIVE DATA'}
        pillTone={loading ? 'neutral' : 'live'}
        actions={
          <PortButton variant="primary" onClick={() => router.push('/business/create')}>
            Create business
          </PortButton>
        }
      />
      {error && <ErrorBanner message={error} />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Businesses" value={items.length} hint="Central tenants" />
        <StatCard accent="gold" label="Pending" value={statusCounts.pending} hint="Awaiting review" />
        <StatCard accent="green" label="Active" value={statusCounts.active} hint="Public sites live" />
        <StatCard accent="purple" label="Inactive" value={statusCounts.inactive} hint="Paused" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPieChart title="Business status" description="Lifecycle mix" data={statusChart} config={STATUS_CONFIG} />
        <DashboardBarChart title="Plans" description="Businesses by plan" data={planChart} config={PLAN_CONFIG} />
      </div>
      <DataTable
        columns={[
          { key: 'name', header: 'Business', render: (r) => r.name || '—' },
          { key: 'slug', header: 'Public URL', render: (r) => publicBusinessPath(r.slug) },
          { key: 'plan', header: 'Plan', render: (r) => (r.plan || 'standard').toUpperCase() },
          {
            key: 'status',
            header: 'Status',
            render: (r) => {
              const label = businessStatusFromRow(r);
              return <StatusChip label={label} tone={statusToneFromValue(label)} />;
            },
          },
          { key: 'branch_count', header: 'Branches', render: (r) => Number(r.branch_count ?? 0) },
        ]}
        rows={items}
        rowKey={(r) => r.id}
        emptyMessage="No businesses yet."
      />
    </div>
  );
}
