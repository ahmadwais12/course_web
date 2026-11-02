'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardBarChart, DashboardPieChart } from '@/components/dashboards/DashboardCharts';
import DashboardSkeleton from '@/components/dashboards/DashboardSkeleton';
import type { ChartConfig } from '@/components/ui/chart';
import { DataTable, ErrorBanner, PageHeader, PortButton, StatusChip, statusToneFromValue, StatCard } from '@/components/ports';
import { toast } from '@/components/ui/Toast';

const GRADE_CONFIG = {
  marks: { label: 'Marks', color: 'var(--chart-3)' },
} satisfies ChartConfig;

const PAY_CONFIG = {
  Paid: { label: 'Paid', color: 'var(--chart-4)' },
  Pending: { label: 'Pending', color: 'var(--chart-5)' },
} satisfies ChartConfig;

export default function StudentDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/student')
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to load student dashboard');
        setData(payload);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load student dashboard';
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, []);

  const grades = Array.isArray(data?.grades) ? data.grades : [];
  const payments = Array.isArray(data?.payments) ? data.payments : [];
  const courses = Array.isArray(data?.courses) ? data.courses : [];
  const gradeChart = useMemo(
    () =>
      grades.slice(0, 8).map((grade: { exam?: { title?: string }; marks?: number; marksObtained?: number }, index: number) => ({
        name: grade.exam?.title || `Exam ${index + 1}`,
        marks: Number(grade.marksObtained ?? grade.marks ?? 0),
      })),
    [grades]
  );
  const paid = payments.filter((row: { status?: string }) => String(row.status || '').toLowerCase() === 'paid' || String(row.status || '').toLowerCase() === 'completed').length;
  const payChart = [
    { name: 'Paid', value: paid, fill: 'var(--color-Paid)' },
    { name: 'Pending', value: Math.max(0, payments.length - paid), fill: 'var(--color-Pending)' },
  ].filter((row) => row.value > 0);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-4 animate-fade-up">
      <PageHeader
        title="Student Dashboard"
        description="Courses, grades, and payment status."
        pill="LIVE DATA"
        pillTone="live"
        actions={
          <PortButton variant="primary" onClick={() => router.push('/courses')}>
            Open courses
          </PortButton>
        }
      />
      {error && <ErrorBanner message={error} />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Courses" value={data?.stats?.courses || courses.length} hint="Enrolled" />
        <StatCard accent="purple" label="Avg. grade" value={data?.stats?.avgGrade || 'N/A'} hint="Recorded marks" />
        <StatCard accent="green" label="Payments" value={payments.length} hint="History" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardBarChart title="Recent grades" data={gradeChart} config={GRADE_CONFIG} />
        <DashboardPieChart title="Payment mix" data={payChart} config={PAY_CONFIG} />
      </div>
      <DataTable
        columns={[
          { key: 'name', header: 'Course', render: (r) => r.name || '—' },
          { key: 'code', header: 'Code', render: (r) => r.code || '—' },
          { key: 'status', header: 'Status', render: (r) => r.status || '—' },
        ]}
        rows={courses}
        rowKey={(r) => r.id || r.code || r.name}
        emptyMessage="No courses enrolled yet."
      />
      <DataTable
        columns={[
          { key: 'type', header: 'Payment', render: (r) => r.type || r.payment_type || '—' },
          {
            key: 'status',
            header: 'Status',
            render: (r) => <StatusChip label={String(r.status || '')} tone={statusToneFromValue(String(r.status || ''))} />,
          },
          { key: 'amount', header: 'Amount', render: (r) => `$${Number(r.amount || 0).toLocaleString()}` },
        ]}
        rows={payments}
        rowKey={(r) => r.id}
        emptyMessage="No payment records."
      />
    </div>
  );
}
