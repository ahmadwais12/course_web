'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { ChartConfig } from '@/components/ui/chart';
import { DashboardBarChart, DashboardPieChart } from '@/components/dashboards/DashboardCharts';
import {
  DataTable,
  ErrorBanner,
  PageHeader,
  SectionPanel,
  StatCard,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';

type ReportData = {
  summary: {
    exams: number;
    completedExams: number;
    avgPercentage: number;
    passRate: number;
    subjects: number;
    activeEnrollments: number;
    graded: number;
  };
  monthly: { key: string; label: string; average: number; graded: number }[];
  classPerformance: { id: string; name: string; average: number; students: number }[];
  gradeDistribution: { name: string; value: number }[];
};

const PALETTE = ['#38bdf8', '#34d399', '#a78bfa', '#fbbf24', '#fb7185', '#94a3b8'];

const MONTHLY_CONFIG = {
  average: { label: 'Average %', color: 'var(--chart-2)' },
} satisfies ChartConfig;

export default function AcademicReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/reports/academic');
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load academic report');
        if (!cancelled) {
          setData(body);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load academic report';
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

  const gradeChart = useMemo(() => {
    const rows = data?.gradeDistribution ?? [];
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
        title="Academic Reports"
        description="Exam performance, class averages, pass rates, and grade distribution"
        pill={loading ? 'LOADING…' : 'LIVE DATA'}
        pillTone={loading ? 'neutral' : 'live'}
      />

      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Average score" value={summary ? `${summary.avgPercentage}%` : '—'} accent="blue" />
        <StatCard label="Pass rate" value={summary ? `${summary.passRate}%` : '—'} accent="green" />
        <StatCard label="Graded results" value={summary?.graded ?? '—'} accent="gold" />
        <StatCard label="Active enrollments" value={summary?.activeEnrollments ?? '—'} accent="purple" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardBarChart
          title="Average score by month"
          description="Average graded percentage over the last six months"
          data={(data?.monthly ?? []).map((row) => ({ label: row.label, average: row.average }))}
          config={MONTHLY_CONFIG}
        />
        <DashboardPieChart
          title="Grade distribution"
          description="All recorded results by letter grade"
          data={gradeChart.data}
          config={gradeChart.config}
        />
      </div>

      <SectionPanel title="Class performance" description="Highest averages across classes">
        <DataTable
          columns={[
            {
              key: 'name',
              header: 'Class',
              render: (row) => <span className="font-semibold">{row.name}</span>,
            },
            { key: 'average', header: 'Average %', align: 'right', render: (row) => `${row.average}%` },
            { key: 'students', header: 'Students graded', align: 'center', render: (row) => row.students },
          ]}
          rows={data?.classPerformance ?? []}
          rowKey={(row) => row.id}
          loading={loading}
          emptyMessage="No graded results yet. Grades appear here once exams are scored."
        />
      </SectionPanel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Exams" value={summary?.exams ?? '—'} accent="blue" />
        <StatCard label="Completed exams" value={summary?.completedExams ?? '—'} accent="green" />
        <StatCard label="Subjects" value={summary?.subjects ?? '—'} accent="gold" />
        <StatCard label="Class averages tracked" value={data?.classPerformance.length ?? '—'} accent="purple" />
      </div>
    </div>
  );
}
