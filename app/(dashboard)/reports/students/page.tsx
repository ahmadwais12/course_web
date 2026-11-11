'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { ChartConfig } from '@/components/ui/chart';
import { DashboardAreaChart, DashboardPieChart } from '@/components/dashboards/DashboardCharts';
import { DataTable, ErrorBanner, PageHeader, SectionPanel, StatCard } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { money } from '@/lib/display';

type ReportData = {
  summary: {
    total: number;
    active: number;
    graduated: number;
    inactive: number;
    newThisMonth: number;
    female: number;
    male: number;
    outstanding: number;
    avgAttendance: number;
    avgGrade: number;
  };
  monthly: { key: string; label: string; joined: number }[];
  byClass: { id: string; name: string; students: number; outstanding: number; attendance: number }[];
  byProgram: { name: string; value: number }[];
};

const PALETTE = ['#38bdf8', '#34d399', '#a78bfa', '#fbbf24', '#fb7185', '#94a3b8', '#2dd4bf'];

const ENROLLMENT_CONFIG = {
  joined: { label: 'New students', color: 'var(--chart-1)' },
} satisfies ChartConfig;

export default function StudentsReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/reports/students');
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load student report');
        if (!cancelled) {
          setData(body);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load student report';
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

  const programChart = useMemo(() => {
    const rows = data?.byProgram ?? [];
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
        title="Student Reports"
        description="Enrollment numbers, class distribution, attendance, and outstanding balances"
        pill={loading ? 'LOADING…' : 'LIVE DATA'}
        pillTone={loading ? 'neutral' : 'live'}
      />

      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total students" value={summary?.total ?? '—'} accent="blue" />
        <StatCard label="Active" value={summary?.active ?? '—'} accent="green" />
        <StatCard label="New this month" value={summary?.newThisMonth ?? '—'} accent="gold" />
        <StatCard label="Outstanding fees" value={summary ? money(summary.outstanding) : '—'} accent="purple" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardAreaChart
          title="New enrollments"
          description="Students joined over the last six months"
          data={(data?.monthly ?? []).map((row) => ({ label: row.label, joined: row.joined }))}
          config={ENROLLMENT_CONFIG}
        />
        <DashboardPieChart
          title="Students by program"
          description="Distribution across programs"
          data={programChart.data}
          config={programChart.config}
        />
      </div>

      <SectionPanel title="Students by class" description="Class size, attendance, and outstanding fees">
        <DataTable
          columns={[
            { key: 'name', header: 'Class', render: (row) => <span className="font-semibold">{row.name}</span> },
            { key: 'students', header: 'Students', align: 'center', render: (row) => row.students },
            { key: 'attendance', header: 'Attendance %', align: 'right', render: (row) => `${row.attendance}%` },
            { key: 'outstanding', header: 'Outstanding', align: 'right', render: (row) => money(row.outstanding) },
          ]}
          rows={data?.byClass ?? []}
          rowKey={(row) => row.id}
          loading={loading}
          emptyMessage="No students found yet."
        />
      </SectionPanel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Female students" value={summary?.female ?? '—'} accent="purple" />
        <StatCard label="Male students" value={summary?.male ?? '—'} accent="blue" />
        <StatCard label="Avg attendance" value={summary ? `${summary.avgAttendance}%` : '—'} accent="green" />
        <StatCard label="Avg grade" value={summary?.avgGrade ?? '—'} accent="gold" />
      </div>
    </div>
  );
}
