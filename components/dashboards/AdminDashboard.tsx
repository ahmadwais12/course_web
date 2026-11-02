'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import CityMap, { type CityStats } from '@/components/dashboards/CityMap';
import {
  DashboardAreaChart,
  DashboardBarChart,
  DashboardPieChart,
} from '@/components/dashboards/DashboardCharts';
import DateFilterBar, { daysAgo } from '@/components/dashboards/DateFilterBar';
import type { ChartConfig } from '@/components/ui/chart';
import {
  DataTable,
  Dropdown,
  ErrorBanner,
  PageHeader,
  PortButton,
  SectionPanel,
  StatCard,
  StatusChip,
  statusToneFromValue,
} from '@/components/ports';

type TrendPoint = {
  date: string;
  count: number;
  values: Record<string, number>;
};

type ChannelRow = {
  name: string;
  total: number;
  values: number[];
  success: number;
};

type DealRow = {
  name: string;
  total: number;
  values: number[];
  rate: number;
  subcategories?: { key: string; total: number; values: number[]; rate: number }[];
};

type AttentionRow = {
  id: string;
  customer: string;
  contact_number?: string;
  method?: string;
  deal?: string;
  status: string;
  vehicle?: string;
  last?: string;
  days?: number;
  link?: string;
};

type DashboardData = {
  students?: number;
  courses?: number;
  staff?: number;
  revenue?: number;
  total?: number;
  statuses?: Record<string, number>;
  payment_statuses?: Record<string, number>;
  enrollment_statuses?: Record<string, number>;
  attention_total?: number;
  attention?: AttentionRow[];
  trend?: TrendPoint[];
  trend_event_total?: number;
  channels?: ChannelRow[];
  deals?: DealRow[];
  vehicles?: { name: string; total: number }[];
  locations?: CityStats[];
  interactions?: number;
  success_rate?: number;
  period?: { from: string; to: string };
  filter_options?: { methods: string[]; statuses: string[]; cities?: string[] };
  system?: {
    businesses?: number;
    branches?: number;
    users?: number;
    tickets?: number;
    leaves?: number;
    classes?: number;
    books?: number;
  };
  error?: string;
};

const METRIC_STATUSES = [
  { name: 'completed', label: 'Completed', color: 'green', hex: '#6bcbaa' },
  { name: 'pending', label: 'Pending', color: 'gold', hex: '#f0ce72' },
  { name: 'failed', label: 'Failed', color: 'purple', hex: '#c6a2ed' },
  { name: 'refunded', label: 'Refunded', color: 'gray', hex: '#91a0b0' },
  { name: 'active', label: 'Active enroll', color: 'blue', hex: '#82b0f5' },
] as const;

const TREND_CONFIG = {
  enrollments: { label: 'Enrollments', color: 'var(--chart-1)' },
  payments: { label: 'Payments', color: 'var(--chart-2)' },
  students: { label: 'New students', color: 'var(--chart-3)' },
} satisfies ChartConfig;

const MIX_CONFIG = {
  enrollments: { label: 'Enrollments', color: 'var(--chart-1)' },
  payments: { label: 'Payments', color: 'var(--chart-3)' },
} satisfies ChartConfig;

const METHOD_CONFIG = {
  completed: { label: 'Completed', color: 'var(--chart-4)' },
  pending: { label: 'Pending', color: 'var(--chart-5)' },
  failed: { label: 'Failed', color: '#c6a2ed' },
  refunded: { label: 'Refunded', color: '#91a0b0' },
  voided: { label: 'Voided', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const COURSE_CONFIG = {
  courses: { label: 'Courses', color: 'var(--chart-1)' },
} satisfies ChartConfig;

export default function AdminDashboard({ stats }: { stats: DashboardData | null }) {
  const router = useRouter();
  const [filters, setFilters] = useState({
    from: daysAgo(29),
    to: daysAgo(0),
    method: '',
    status: '',
    city: '',
  });
  const [data, setData] = useState<DashboardData | null>(stats);
  const [loading, setLoading] = useState(!stats);
  const [loadError, setLoadError] = useState('');
  const [expandedDealRows, setExpandedDealRows] = useState<Record<string, boolean>>({});

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams({
        from: filters.from,
        to: filters.to,
        ...(filters.method ? { method: filters.method } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.city ? { city: filters.city } : {}),
      });
      const res = await fetch(`/api/dashboard/stats?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not load dashboard data.');
      setData(json);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(() => fetchDashboard(), 200);
    return () => clearTimeout(t);
  }, [fetchDashboard]);

  useEffect(() => {
    if (stats && !data) setData(stats);
  }, [stats, data]);

  const dash = data || {};
  const statuses = dash.statuses || {};
  const trend = dash.trend || [];
  const channels = dash.channels || [];
  const deals = dash.deals || [];
  const vehicles = dash.vehicles || [];
  const attention = dash.attention || [];
  const locations = dash.locations || [];

  const enrollmentsDeal = deals.find((d) => d.name === 'Enrollments');
  const paymentsDeal = deals.find((d) => d.name === 'Payments');
  const enrollTotal = enrollmentsDeal?.total || 0;
  const payTotal = paymentsDeal?.total || 0;
  const successRate = dash.success_rate ?? 0;
  const completedPayments = dash.payment_statuses?.completed || statuses.completed || 0;

  const trendChart = useMemo(
    () =>
      trend.map((point) => ({
        label: new Date(`${point.date}T00:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        enrollments: Number(point.values?.enrollments || 0),
        payments: Number(point.values?.payments || 0),
        students: Number(point.values?.students || 0),
      })),
    [trend]
  );

  const methodChart = useMemo(
    () =>
      channels.map((row) => ({
        name: row.name,
        completed: Number(row.values?.[0] || 0),
        pending: Number(row.values?.[1] || 0),
        failed: Number(row.values?.[2] || 0),
        refunded: Number(row.values?.[3] || 0),
        voided: Number(row.values?.[4] || 0),
      })),
    [channels]
  );

  const courseChart = useMemo(
    () => vehicles.map((row) => ({ name: row.name, courses: row.total })),
    [vehicles]
  );

  const mixChart = [
    { name: 'enrollments', value: enrollTotal, fill: 'var(--color-enrollments)' },
    { name: 'payments', value: payTotal, fill: 'var(--color-payments)' },
  ].filter((row) => row.value > 0);

  const snapshot = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Kabul',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const cityOptions = dash.filter_options?.cities?.length
    ? dash.filter_options.cities
    : locations.map((row) => row.name);

  return (
    <div className="space-y-4 animate-fade-up">
      <PageHeader
        title="General Dashboard"
        description={`All system data — students, staff, finance, support, and businesses${filters.city ? ` · ${filters.city}` : ''}`}
        pill={loadError ? 'API UNAVAILABLE' : loading ? 'LOADING…' : 'LIVE DATA'}
        pillTone={loadError ? 'offline' : loading ? 'neutral' : 'live'}
        actions={
          <div className="flex flex-wrap gap-2">
            <PortButton variant="ghost" onClick={() => fetchDashboard()} disabled={loading}>
              Refresh
            </PortButton>
            <PortButton variant="primary" onClick={() => router.push('/students')}>
              View students
            </PortButton>
          </div>
        }
      />

      {loading && !data && <ErrorBanner message="Loading dashboard data…" />}
      {loadError && !data && <ErrorBanner message={loadError} />}

      {(data || !loading) && (
        <>
          {loadError && data && (
            <ErrorBanner message={`Could not refresh dashboard data. Showing the last successful response. ${loadError}`} />
          )}

          <SectionPanel title="Filters" description="Date range, city, and payment slices.">
            <div className="space-y-4">
              <DateFilterBar
                from={filters.from}
                to={filters.to}
                onChange={({ from, to }) => setFilters((f) => ({ ...f, from, to }))}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <Dropdown
                  label="City"
                  value={filters.city}
                  onChange={(city) => setFilters((f) => ({ ...f, city }))}
                  options={cityOptions.map((city) => ({ value: city, label: city }))}
                  placeholder="All cities"
                  filter
                  clearable
                />
                <Dropdown
                  label="Payment method"
                  value={filters.method}
                  onChange={(method) => setFilters((f) => ({ ...f, method }))}
                  options={(dash.filter_options?.methods || []).map((m) => ({ value: m, label: m }))}
                  placeholder="All methods"
                  filter
                  clearable
                />
                <Dropdown
                  label="Payment status"
                  value={filters.status}
                  onChange={(status) => setFilters((f) => ({ ...f, status }))}
                  options={(dash.filter_options?.statuses || METRIC_STATUSES.map((s) => s.name)).map((s) => ({
                    value: s,
                    label: s,
                  }))}
                  placeholder="All statuses"
                  filter
                  clearable
                />
              </div>
              <PortButton
                variant="secondary"
                onClick={() =>
                  setFilters({ from: daysAgo(29), to: daysAgo(0), method: '', status: '', city: '' })
                }
              >
                Reset filters
              </PortButton>
            </div>
          </SectionPanel>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
            <StatCard label="Students" value={dash.students ?? 0} hint={filters.city || 'All campuses'} />
            <StatCard accent="blue" label="Courses" value={dash.courses ?? 0} hint="Catalog" />
            <StatCard accent="purple" label="Staff" value={dash.staff ?? 0} hint="Teachers" />
            <StatCard accent="green" label="Revenue" value={`$${Number(dash.revenue || 0).toLocaleString()}`} hint="Completed" />
            <StatCard accent="gold" label="Pending pay" value={statuses.pending || 0} hint="Payments" />
            <StatCard accent="gold" label="Attention" value={dash.attention_total || 0} hint="Follow-up" />
            <StatCard accent="blue" label="Businesses" value={dash.system?.businesses ?? 0} hint="Central tenants" />
            <StatCard accent="purple" label="Branches" value={dash.system?.branches ?? 0} hint="Locations" />
            <StatCard accent="green" label="Users" value={dash.system?.users ?? 0} hint="Accounts" />
            <StatCard accent="gold" label="Tickets" value={dash.system?.tickets ?? 0} hint="Support" />
            <StatCard accent="blue" label="Classes" value={dash.system?.classes ?? 0} hint="Timetable" />
            <StatCard accent="purple" label="Leaves" value={dash.system?.leaves ?? 0} hint="HR leave" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 min-w-0">
              <DashboardAreaChart
                title="Activity trend"
                description={`${dash.period?.from || ''} – ${dash.period?.to || ''} · ${Number(dash.trend_event_total || 0).toLocaleString()} events`}
                data={trendChart}
                config={TREND_CONFIG}
              />
            </div>
            <div className="min-w-0">
              <DashboardPieChart
                title="Activity mix"
                description={`Success ${completedPayments} · ${successRate}%`}
                data={mixChart}
                config={MIX_CONFIG}
              />
            </div>
          </div>

          <CityMap
            locations={locations}
            selected={filters.city}
            onSelect={(city) => setFilters((f) => ({ ...f, city }))}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <DashboardBarChart
              title="Status by payment method"
              description="Stacked payment outcomes for each method"
              data={methodChart}
              config={METHOD_CONFIG}
              stacked
            />
            <DashboardBarChart
              title="Courses recorded"
              description="Course catalog volume"
              data={courseChart}
              config={COURSE_CONFIG}
              layout="horizontal"
            />
          </div>

          <SectionPanel
            title="Status by activity type"
            description="Current status of enrollments and payments. Expand a row to see subcategories."
            bodyClassName="pt-2"
          >
            <DataTable
              columns={[
                {
                  key: 'name',
                  header: 'Type / Subcategory',
                  render: (r) =>
                    r.subcategories?.length ? (
                      <PortButton
                        variant="ghost"
                        onClick={() =>
                          setExpandedDealRows((prev) => ({ ...prev, [r.name]: !prev[r.name] }))
                        }
                      >
                        {expandedDealRows[r.name] ? '▾' : '▸'} {r.name}
                      </PortButton>
                    ) : (
                      <span className="font-semibold">{r.name}</span>
                    ),
                },
                { key: 'total', header: 'Total' },
                {
                  key: 'a',
                  header: 'A',
                  render: (r) => (Array.isArray(r.values) ? r.values[0] : '—'),
                },
                {
                  key: 'b',
                  header: 'B',
                  render: (r) => (Array.isArray(r.values) ? r.values[1] : '—'),
                },
                {
                  key: 'c',
                  header: 'C',
                  render: (r) => (Array.isArray(r.values) ? r.values[2] : '—'),
                },
                {
                  key: 'd',
                  header: 'D',
                  render: (r) => (Array.isArray(r.values) ? r.values[3] : '—'),
                },
                {
                  key: 'e',
                  header: 'E',
                  render: (r) => (Array.isArray(r.values) ? r.values[4] : '—'),
                },
                { key: 'rate', header: 'Success %', align: 'right', render: (r) => `${r.rate}%` },
              ]}
              rows={deals.flatMap((r) => [
                r,
                ...(expandedDealRows[r.name]
                  ? (r.subcategories || []).map((category) => ({
                      ...category,
                      name: `↳ ${category.key}`,
                      subcategories: undefined,
                    }))
                  : []),
              ])}
              rowKey={(r, i) => `${r.name}-${i}`}
              emptyMessage="No activity for this period."
            />
          </SectionPanel>

          <SectionPanel
            title={`Needs Attention ${dash.attention_total || 0}`}
            description="Pending/failed payments and inactive students requiring follow-up"
            headerRight={
              <PortButton variant="secondary" onClick={() => router.push('/payments')}>
                View all payments
              </PortButton>
            }
            bodyClassName="pt-2"
          >
            <DataTable
              columns={[
                { key: 'customer', header: 'Record' },
                { key: 'contact_number', header: 'Contact', render: (item) => item.contact_number || '—' },
                { key: 'method', header: 'Method / Email', render: (item) => item.method || '—' },
                { key: 'deal', header: 'Type', render: (item) => item.deal || '—' },
                {
                  key: 'status',
                  header: 'Status',
                  render: (item) => (
                    <StatusChip
                      label={item.status.replace('_', ' ')}
                      tone={statusToneFromValue(item.status)}
                    />
                  ),
                },
                { key: 'vehicle', header: 'Detail', render: (item) => item.vehicle || '—' },
                { key: 'last', header: 'Last date', render: (item) => item.last || '—' },
                {
                  key: 'days',
                  header: 'Age',
                  align: 'right',
                  render: (item) => `${item.days ?? '—'} days`,
                },
              ]}
              rows={attention}
              rowKey={(item) => item.id}
              emptyMessage="No items need attention for these filters."
            />
          </SectionPanel>

          <p className="text-xs text-muted-foreground">
            Figures reflect saved EMIS institute records{filters.city ? ` for ${filters.city}` : ''}.
            Snapshot: {snapshot} Kabul time
          </p>
        </>
      )}
    </div>
  );
}
