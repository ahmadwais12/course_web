'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { ChartConfig } from '@/components/ui/chart';
import {
  DashboardBarChart,
  DashboardPieChart,
} from '@/components/dashboards/DashboardCharts';
import {
  DataTable,
  ErrorBanner,
  PageHeader,
  SectionPanel,
  StatCard,
  StatusChip,
  statusToneFromValue,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { money } from '@/lib/display';

type ReportData = {
  summary: {
    collected: number;
    expenses: number;
    net: number;
    outstanding: number;
    collectionRate: number;
    invoices: number;
    studentsWithDues: number;
  };
  monthly: { key: string; label: string; income: number; expenses: number }[];
  expenseCategories: { name: string; value: number }[];
  invoiceStatus: { name: string; value: number }[];
  topOutstanding: { id: string; name: string; code: string | null; outstanding: number }[];
};

const PALETTE = ['#38bdf8', '#34d399', '#a78bfa', '#fbbf24', '#fb7185', '#94a3b8', '#2dd4bf'];

const MONTHLY_CONFIG = {
  income: { label: 'Income', color: 'var(--chart-2)' },
  expenses: { label: 'Expenses', color: 'var(--chart-4)' },
} satisfies ChartConfig;

export default function FinanceReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/finance/reports');
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load finance report');
        if (!cancelled) {
          setData(body);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load finance report';
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

  const monthlyChart = useMemo(
    () =>
      (data?.monthly ?? []).map((month) => ({
        name: month.label,
        income: month.income,
        expenses: month.expenses,
      })),
    [data]
  );

  const expenseChart = useMemo(() => {
    const categories = data?.expenseCategories ?? [];
    return {
      data: categories.map((category, index) => ({
        name: category.name,
        value: category.value,
        fill: PALETTE[index % PALETTE.length],
      })),
      config: categories.reduce<ChartConfig>((config, category, index) => {
        config[category.name] = {
          label: category.name,
          color: PALETTE[index % PALETTE.length],
        };
        return config;
      }, {}),
    };
  }, [data]);

  const summary = data?.summary;

  return (
    <div className="min-w-0 space-y-4 animate-fade-up">
      <PageHeader
        title="Financial Reports"
        description="Fee collection, expenses, outstanding balances, and net position"
        pill={loading ? 'LOADING…' : 'LIVE DATA'}
        pillTone={loading ? 'neutral' : 'live'}
      />

      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Collected" value={summary ? money(summary.collected) : '—'} accent="green" />
        <StatCard label="Expenses" value={summary ? money(summary.expenses) : '—'} accent="gold" />
        <StatCard label="Net position" value={summary ? money(summary.net) : '—'} accent="blue" />
        <StatCard
          label="Outstanding"
          value={summary ? money(summary.outstanding) : '—'}
          hint={summary ? `${summary.studentsWithDues} students with dues` : undefined}
          accent="purple"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <DashboardBarChart
            title="Income vs expenses"
            description="Recorded payments and expenses over the last six months"
            data={monthlyChart}
            config={MONTHLY_CONFIG}
          />
        </div>
        <DashboardPieChart
          title="Expense mix"
          description="Spending by category"
          data={expenseChart.data}
          config={expenseChart.config}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionPanel
          title="Invoice status"
          description={summary ? `${summary.invoices} invoices · ${summary.collectionRate}% collected` : undefined}
        >
          <div className="space-y-2">
            {(data?.invoiceStatus ?? []).map((row) => (
              <div
                key={row.name}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2"
              >
                <StatusChip
                  label={row.name}
                  tone={statusToneFromValue(row.name)}
                />
                <span className="text-sm font-semibold tabular-nums">{row.value}</span>
              </div>
            ))}
            {!data?.invoiceStatus.length && (
              <p className="text-sm text-muted-foreground">No invoices recorded yet.</p>
            )}
          </div>
        </SectionPanel>

        <SectionPanel
          title="Top outstanding balances"
          description="Students with the highest unpaid amounts"
        >
          <DataTable
            columns={[
              {
                key: 'name',
                header: 'Student',
                render: (row) => (
                  <div>
                    <div className="font-semibold">{row.name}</div>
                    {row.code && <div className="text-xs text-muted-foreground">{row.code}</div>}
                  </div>
                ),
              },
              {
                key: 'outstanding',
                header: 'Outstanding',
                align: 'right',
                render: (row) => money(row.outstanding),
              },
            ]}
            rows={data?.topOutstanding ?? []}
            rowKey={(row) => row.id}
            emptyMessage="No outstanding balances."
          />
        </SectionPanel>
      </div>
    </div>
  );
}
