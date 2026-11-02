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

type StaffRow = {
  id?: string;
  name?: string;
  role?: string;
  salary?: number;
  status?: string;
};

const ROLE_CONFIG = {
  people: { label: 'Staff', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const STATUS_CONFIG = {
  Active: { label: 'Active', color: 'var(--chart-4)' },
  inactive: { label: 'Inactive', color: '#91a0b0' },
} satisfies ChartConfig;

export default function StaffDashboard({ stats }: { stats: any }) {
  const router = useRouter();
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/staff')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load staff');
        setStaffList(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load staff';
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, []);

  const payroll = useMemo(
    () => staffList.reduce((sum, row) => sum + Number(row.salary || 0), 0),
    [staffList]
  );
  const active = staffList.filter((row) => String(row.status || '').toLowerCase() === 'active').length;
  const roleChart = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of staffList) {
      const role = row.role || 'Staff';
      map.set(role, (map.get(role) || 0) + 1);
    }
    return [...map.entries()].map(([name, people]) => ({ name, people }));
  }, [staffList]);
  const statusChart = [
    { name: 'Active', value: active, fill: 'var(--color-Active)' },
    { name: 'inactive', value: Math.max(0, staffList.length - active), fill: 'var(--color-inactive)' },
  ].filter((row) => row.value > 0);

  return (
    <div className="space-y-4 animate-fade-up">
      <PageHeader
        title="Staff Dashboard"
        description="HR headcount, roles, and payroll snapshot."
        pill={loading ? 'LOADING…' : 'LIVE DATA'}
        pillTone={loading ? 'neutral' : 'live'}
        actions={
          <PortButton variant="primary" onClick={() => router.push('/hr/staff')}>
            Open staff
          </PortButton>
        }
      />
      {error && <ErrorBanner message={error} />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Staff" value={staffList.length || stats?.staff || 0} hint="Directory" />
        <StatCard accent="green" label="Active" value={active} hint="On duty" />
        <StatCard accent="purple" label="Payroll" value={`$${payroll.toLocaleString()}`} hint="Listed salaries" />
        <StatCard accent="gold" label="Students" value={stats?.students || 0} hint="Institute" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardBarChart
          title="Staff by role"
          description="Headcount across roles"
          data={roleChart}
          config={ROLE_CONFIG}
          layout="horizontal"
        />
        <DashboardPieChart title="Employment status" data={statusChart} config={STATUS_CONFIG} />
      </div>
      <DataTable
        columns={[
          { key: 'name', header: 'Staff member', render: (r) => r.name || '—' },
          { key: 'role', header: 'Role', render: (r) => r.role || '—' },
          { key: 'salary', header: 'Salary', render: (r) => `$${Number(r.salary || 0).toLocaleString()}` },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <StatusChip
                label={String(r.status || '—')}
                tone={statusToneFromValue(String(r.status || ''))}
              />
            ),
          },
        ]}
        rows={staffList}
        rowKey={(r, i) => r.id || String(i)}
        emptyMessage="No staff members found."
      />
    </div>
  );
}
