'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { ChartConfig } from '@/components/ui/chart';
import { DashboardBarChart, DashboardPieChart } from '@/components/dashboards/DashboardCharts';
import { DataTable, ErrorBanner, PageHeader, SectionPanel, StatCard } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { money } from '@/lib/display';

type ReportData = {
  summary: {
    teachers: number;
    staff: number;
    total: number;
    active: number;
    departments: number;
    pendingLeaves: number;
    approvedLeaves: number;
    approvedLeaveDays: number;
    payrollRuns: number;
    latestPayrollNet: number;
    latestPayrollGross: number;
    latestPayrollEmployees: number;
  };
  monthlyPayroll: { key: string; label: string; net: number }[];
  leaveBreakdown: { name: string; value: number }[];
  departments: { name: string; teachers: number; staff: number }[];
};

const PALETTE = ['#fbbf24', '#34d399', '#fb7185', '#94a3b8'];

const PAYROLL_CONFIG = {
  net: { label: 'Net payroll', color: 'var(--chart-4)' },
} satisfies ChartConfig;

export default function HrReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/reports/hr');
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load HR report');
        if (!cancelled) {
          setData(body);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load HR report';
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

  const leaveChart = useMemo(() => {
    const rows = (data?.leaveBreakdown ?? []).filter((row) => row.value > 0);
    return {
      data: rows.map((row, index) => ({
        name: row.name,
        value: row.value,
        fill: PALETTE[index % PALETTE.length],
      })),
      config: rows.reduce<ChartConfig>((config, row, index) => {
        config[row.name] = { label: row.name, color: PALETTE[index % PALETTE.length] };
        return config;
      }, {}),
    };
  }, [data]);

  const summary = data?.summary;

  return (
    <div className="min-w-0 space-y-4 animate-fade-up">
      <PageHeader
        title="HR Reports"
        description="Headcount, department distribution, payroll runs, and staff leave"
        pill={loading ? 'LOADING…' : 'LIVE DATA'}
        pillTone={loading ? 'neutral' : 'live'}
      />

      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total staff" value={summary?.total ?? '—'} accent="blue" />
        <StatCard label="Teachers" value={summary?.teachers ?? '—'} accent="green" />
        <StatCard label="Staff" value={summary?.staff ?? '—'} accent="gold" />
        <StatCard label="Active" value={summary?.active ?? '—'} accent="purple" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardBarChart
          title="Payroll by month"
          description="Net payroll released over the last six months"
          data={(data?.monthlyPayroll ?? []).map((row) => ({ label: row.label, net: row.net }))}
          config={PAYROLL_CONFIG}
        />
        <DashboardPieChart
          title="Leave requests"
          description="All employee leave requests by status"
          data={leaveChart.data}
          config={leaveChart.config}
        />
      </div>

      <SectionPanel title="Headcount by department" description="Teachers and staff grouped by department">
        <DataTable
          columns={[
            { key: 'name', header: 'Department', render: (row) => <span className="font-semibold">{row.name}</span> },
            { key: 'teachers', header: 'Teachers', align: 'center', render: (row) => row.teachers },
            { key: 'staff', header: 'Staff', align: 'center', render: (row) => row.staff },
            {
              key: 'total',
              header: 'Total',
              align: 'right',
              render: (row) => <span className="font-semibold">{row.teachers + row.staff}</span>,
            },
          ]}
          rows={data?.departments ?? []}
          rowKey={(row) => row.name}
          loading={loading}
          emptyMessage="No employees found yet."
        />
      </SectionPanel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Latest payroll net"
          value={summary ? money(summary.latestPayrollNet) : '—'}
          accent="blue"
        />
        <StatCard
          label="Latest payroll gross"
          value={summary ? money(summary.latestPayrollGross) : '—'}
          accent="gold"
        />
        <StatCard label="Payroll runs" value={summary?.payrollRuns ?? '—'} accent="green" />
        <StatCard label="Pending leave" value={summary?.pendingLeaves ?? '—'} accent="purple" />
      </div>
    </div>
  );
}
