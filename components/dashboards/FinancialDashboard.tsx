'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardAreaChart, DashboardPieChart } from '@/components/dashboards/DashboardCharts';
import type { ChartConfig } from '@/components/ui/chart';
import { DataTable, PageHeader, PortButton, StatusChip, statusToneFromValue, StatCard } from '@/components/ports';

const TREND_CONFIG = {
  payments: { label: 'Payments', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const STATUS_CONFIG = {
  completed: { label: 'Completed', color: 'var(--chart-4)' },
  pending: { label: 'Pending', color: 'var(--chart-5)' },
  failed: { label: 'Failed', color: '#c6a2ed' },
  refunded: { label: 'Refunded', color: '#91a0b0' },
} satisfies ChartConfig;

export default function FinancialDashboard({ stats }: { stats?: any }) {
  const router = useRouter();
  const paymentStatuses = stats?.payment_statuses || {};
  const attention = Array.isArray(stats?.attention) ? stats.attention : [];
  const trend = useMemo(
    () =>
      (stats?.trend || []).map((point: { date: string; values?: Record<string, number> }) => ({
        label: new Date(`${point.date}T00:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        payments: Number(point.values?.payments || 0),
      })),
    [stats]
  );
  const statusChart = [
    { name: 'completed', value: Number(paymentStatuses.completed || 0), fill: 'var(--color-completed)' },
    { name: 'pending', value: Number(paymentStatuses.pending || 0), fill: 'var(--color-pending)' },
    { name: 'failed', value: Number(paymentStatuses.failed || 0), fill: 'var(--color-failed)' },
    { name: 'refunded', value: Number(paymentStatuses.refunded || 0), fill: 'var(--color-refunded)' },
  ].filter((row) => row.value > 0);

  return (
    <div className="space-y-4 animate-fade-up">
      <PageHeader
        title="Finance Dashboard"
        description="Revenue, payment outcomes, and items that need follow-up."
        pill={stats ? 'LIVE DATA' : 'LOADING…'}
        pillTone={stats ? 'live' : 'neutral'}
        actions={
          <PortButton variant="primary" onClick={() => router.push('/payments')}>
            Open payments
          </PortButton>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          accent="green"
          label="Revenue"
          value={`$${Number(stats?.revenue || 0).toLocaleString()}`}
          hint="Completed"
        />
        <StatCard accent="gold" label="Pending" value={paymentStatuses.pending || 0} hint="Awaiting" />
        <StatCard accent="purple" label="Failed" value={paymentStatuses.failed || 0} hint="Needs retry" />
        <StatCard accent="blue" label="Success rate" value={`${stats?.success_rate ?? 0}%`} hint="Completed / all" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 min-w-0">
          <DashboardAreaChart title="Payment trend" description="Payments in the selected period" data={trend} config={TREND_CONFIG} />
        </div>
        <DashboardPieChart title="Payment status" data={statusChart} config={STATUS_CONFIG} />
      </div>
      <DataTable
        columns={[
          { key: 'customer', header: 'Record', render: (r) => r.customer || '—' },
          { key: 'deal', header: 'Type', render: (r) => r.deal || '—' },
          {
            key: 'status',
            header: 'Status',
            render: (r) => <StatusChip label={String(r.status || '')} tone={statusToneFromValue(String(r.status || ''))} />,
          },
          { key: 'vehicle', header: 'Amount', render: (r) => r.vehicle || '—' },
        ]}
        rows={attention.filter((row: { deal?: string }) => row.deal === 'Payment')}
        rowKey={(r) => r.id}
        emptyMessage="No payment follow-up items."
      />
    </div>
  );
}
