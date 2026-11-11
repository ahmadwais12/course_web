'use client';

import React, { useEffect, useState } from 'react';
import type { ChartConfig } from '@/components/ui/chart';
import { DashboardBarChart } from '@/components/dashboards/DashboardCharts';
import { DataTable, ErrorBanner, PageHeader, SectionPanel, StatCard } from '@/components/ports';
import { toast } from '@/components/ui/Toast';

type ReportData = {
  summary: {
    records: number;
    presentRate: number;
    absent: number;
    late: number;
    excused: number;
    todayTotal: number;
    todayPresent: number;
    classesTracked: number;
  };
  monthly: { key: string; label: string; present: number; absent: number; late: number }[];
  classBreakdown: { id: string; name: string; rate: number; absent: number; records: number }[];
};

const MONTHLY_CONFIG = {
  present: { label: 'Present', color: 'var(--chart-2)' },
  absent: { label: 'Absent', color: 'var(--chart-4)' },
} satisfies ChartConfig;

export default function AttendanceReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/reports/attendance');
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load attendance report');
        if (!cancelled) {
          setData(body);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load attendance report';
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

  const summary = data?.summary;

  return (
    <div className="min-w-0 space-y-4 animate-fade-up">
      <PageHeader
        title="Attendance Reports"
        description="Student attendance rates, monthly trends, and class-level breakdown"
        pill={loading ? 'LOADING…' : 'LIVE DATA'}
        pillTone={loading ? 'neutral' : 'live'}
      />

      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Attendance rate" value={summary ? `${summary.presentRate}%` : '—'} accent="green" />
        <StatCard label="Records" value={summary?.records ?? '—'} accent="blue" />
        <StatCard label="Absences" value={summary?.absent ?? '—'} accent="purple" />
        <StatCard label="Late arrivals" value={summary?.late ?? '—'} accent="gold" />
      </div>

      <DashboardBarChart
        title="Monthly attendance"
        description="Present and absent records over the last six months"
        data={(data?.monthly ?? []).map((row) => ({
          label: row.label,
          present: row.present,
          absent: row.absent,
        }))}
        config={MONTHLY_CONFIG}
      />

      <SectionPanel title="Attendance by class" description="Classes with the most attendance records">
        <DataTable
          columns={[
            { key: 'name', header: 'Class', render: (row) => <span className="font-semibold">{row.name}</span> },
            { key: 'rate', header: 'Attendance %', align: 'right', render: (row) => `${row.rate}%` },
            { key: 'absent', header: 'Absences', align: 'center', render: (row) => row.absent },
            { key: 'records', header: 'Records', align: 'center', render: (row) => row.records },
          ]}
          rows={data?.classBreakdown ?? []}
          rowKey={(row) => row.id}
          loading={loading}
          emptyMessage="No attendance records yet."
        />
      </SectionPanel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Today present"
          value={summary ? `${summary.todayPresent}/${summary.todayTotal}` : '—'}
          accent="blue"
        />
        <StatCard label="Excused" value={summary?.excused ?? '—'} accent="green" />
        <StatCard label="Classes tracked" value={summary?.classesTracked ?? '—'} accent="gold" />
        <StatCard label="Dataset size" value={summary?.records ?? '—'} accent="purple" />
      </div>
    </div>
  );
}
