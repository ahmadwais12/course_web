'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardBarChart } from '@/components/dashboards/DashboardCharts';
import DashboardSkeleton from '@/components/dashboards/DashboardSkeleton';
import type { ChartConfig } from '@/components/ui/chart';
import { DataTable, ErrorBanner, PageHeader, PortButton, StatCard } from '@/components/ports';
import { toast } from '@/components/ui/Toast';

const COURSE_CONFIG = {
  students: { label: 'Students', color: 'var(--chart-1)' },
} satisfies ChartConfig;

export default function TeacherDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/teacher')
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to load teacher dashboard');
        setData(payload);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load teacher dashboard';
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, []);

  const courses = Array.isArray(data?.courses) ? data.courses : [];
  const courseChart = useMemo(
    () =>
      courses.map((course: { name?: string; code?: string; students?: number }) => ({
        name: course.name || course.code || 'Course',
        students: Number(course.students || 0),
      })),
    [courses]
  );

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-4 animate-fade-up">
      <PageHeader
        title="Teacher Dashboard"
        description="Classes, students, and course load."
        pill="LIVE DATA"
        pillTone="live"
        actions={
          <PortButton variant="primary" onClick={() => router.push('/classes')}>
            Open classes
          </PortButton>
        }
      />
      {error && <ErrorBanner message={error} />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="My students" value={data?.studentsCount || 0} hint="Assigned" />
        <StatCard accent="blue" label="Active classes" value={data?.activeClasses || 0} hint="Courses" />
        <StatCard accent="green" label="Catalog" value={courses.length} hint="Loaded courses" />
      </div>
      <DashboardBarChart
        title="Course load"
        description="Students recorded per course"
        data={courseChart}
        config={COURSE_CONFIG}
        layout="horizontal"
      />
      <DataTable
        columns={[
          { key: 'name', header: 'Course', render: (r) => r.name || '—' },
          { key: 'code', header: 'Code', render: (r) => r.code || '—' },
          { key: 'students', header: 'Students', render: (r) => Number(r.students || 0) },
        ]}
        rows={courses}
        rowKey={(r) => r.id || r.code || r.name}
        emptyMessage="No courses assigned."
      />
    </div>
  );
}
