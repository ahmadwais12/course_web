'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, FileBarChart, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  DashboardBarChart,
  DashboardPieChart,
} from '@/components/dashboards/DashboardCharts';
import {
  DataTable,
  ErrorBanner,
  Filter,
  PageHeader,
  PortButton,
  SectionPanel,
  StatCard,
  StatusChip,
  statusToneFromValue,
} from '@/components/ports';
import type { ChartConfig } from '@/components/ui/chart';
import type { SelectOption } from '@/components/ports';
import { ProgressBar, VerificationTabs, shortDate } from './shared';

type BranchRow = {
  session_id: string;
  branch: string;
  country: string;
  officer: string;
  expected: number;
  verified: number;
  found: number;
  not_found: number;
  wrong_location: number;
  pending: number;
  completion: number;
  status: string;
  last_verified_at: string | null;
  campaign_name: string;
  campaign_id: string;
};

type Dashboard = {
  headlines: {
    expected: number;
    verified: number;
    found: number;
    not_found: number;
    wrong_location: number;
    damaged: number;
    unregistered: number;
    pending: number;
    completion: number;
    open_discrepancies: number;
  };
  branch_progress: { name: string; verified: number; pending: number; completion: number }[];
  discrepancy_distribution: { type: string; value: number }[];
  branch_rows: BranchRow[];
  filter_options: { campaigns: SelectOption[]; branches: SelectOption[] };
};

const PROGRESS_CONFIG = {
  verified: { label: 'Verified', color: 'var(--chart-4)' },
  pending: { label: 'Pending', color: 'var(--chart-5)' },
} satisfies ChartConfig;

const BRANCH_CONFIG = {
  completion: { label: 'Completion %', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const PALETTE = ['#ef6b6b', '#f4b740', '#88b6ff', '#8f7cf0', '#4fc3a1', '#91a0b0', '#e07ab5'];

function readable(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function VerificationDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState('');
  const [branch, setBranch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (campaignId) params.set('campaign_id', campaignId);
      if (branch) params.set('branch', branch);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(
        `/api/inventory/verification/dashboard${params.toString() ? `?${params.toString()}` : ''}`,
        { cache: 'no-store' }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load the verification dashboard');
      setData(body);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the verification dashboard');
    } finally {
      setLoading(false);
    }
  }, [campaignId, branch, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const progressChart = useMemo(
    () =>
      data
        ? [
            { name: 'verified', value: data.headlines.verified },
            { name: 'pending', value: data.headlines.pending },
          ].filter((row) => row.value > 0)
        : [],
    [data]
  );

  const { discrepancyChart, discrepancyConfig } = useMemo(() => {
    const rows = data?.discrepancy_distribution ?? [];
    const config: ChartConfig = {};
    const chart = rows.map((row, index) => {
      const key = `discrepancy_${index}`;
      config[key] = { label: readable(row.type), color: PALETTE[index % PALETTE.length] };
      return { name: key, value: row.value };
    });
    return { discrepancyChart: chart, discrepancyConfig: config };
  }, [data]);

  const branchChart = useMemo(
    () => (data?.branch_progress ?? []).slice(0, 10).map((row) => ({ name: row.name, completion: row.completion })),
    [data]
  );

  const filterFields = useMemo(
    () => [
      {
        key: 'campaign',
        label: 'Campaign',
        value: campaignId,
        options: data?.filter_options.campaigns ?? [],
        onChange: setCampaignId,
        placeholder: 'All campaigns',
      },
      {
        key: 'branch',
        label: 'Branch',
        value: branch,
        options: data?.filter_options.branches ?? [],
        onChange: setBranch,
        placeholder: 'All branches',
      },
    ],
    [campaignId, branch, data]
  );

  const resetFilters = () => {
    setCampaignId('');
    setBranch('');
    setFrom('');
    setTo('');
  };

  const h = data?.headlines;
  const value = (n: number | undefined) => (n == null ? '—' : n.toLocaleString());
  const rows = data?.branch_rows ?? [];

  return (
    <div className="min-w-0 space-y-4 animate-fade-up">
      <PageHeader
        title="Asset Verification"
        description="Central view of physical verification campaigns, branch progress, and discrepancies."
        pill={loading ? 'LOADING…' : 'LIVE DATA'}
        pillTone={loading ? 'neutral' : 'live'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PortButton onClick={() => router.push('/inventory/verification/reports')}>
              <FileBarChart size={15} /> Reports
            </PortButton>
            <PortButton onClick={() => router.push('/inventory/verification/discrepancies')}>
              Discrepancies
            </PortButton>
            <PortButton variant="primary" onClick={() => router.push('/inventory/verification/campaigns')}>
              <ShieldCheck size={15} /> Campaigns
            </PortButton>
          </div>
        }
      />
      <VerificationTabs />
      {error && <ErrorBanner message={error} />}

      <Filter
        filters={filterFields}
        dateFrom={from}
        dateTo={to}
        onDateRangeChange={({ from: nextFrom, to: nextTo }) => {
          setFrom(nextFrom);
          setTo(nextTo);
        }}
        onReset={resetFilters}
        title="Verification dashboard filters"
        description="Filter sessions by campaign, branch, and the date the session was created."
        actions={
          <PortButton variant="ghost" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </PortButton>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Expected assets" value={value(h?.expected)} hint="Snapshot in sessions" accent="blue" />
        <StatCard label="Verified assets" value={value(h?.verified)} hint="Any recorded result" accent="green" />
        <StatCard label="Assets found" value={value(h?.found)} hint="Result: found" accent="green" />
        <StatCard label="Assets not found" value={value(h?.not_found)} hint="Result: not found" accent="gold" />
        <StatCard label="Wrong location" value={value(h?.wrong_location)} hint="Found elsewhere" accent="gold" />
        <StatCard label="Unregistered" value={value(h?.unregistered)} hint="Discovered assets" accent="purple" />
        <StatCard label="Pending" value={value(h?.pending)} hint="Awaiting inspection" accent="blue" />
        <StatCard
          label="Progress"
          value={`${h?.completion ?? 0}%`}
          hint="Verified ÷ expected"
          accent="purple"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardPieChart
          title="Verification progress"
          description="Verified vs pending expected assets across the selected sessions."
          data={progressChart}
          config={PROGRESS_CONFIG}
        />
        <div className="min-w-0 lg:col-span-2">
          <DashboardBarChart
            title="Branch comparison"
            description="Completion percentage by branch, highest first."
            data={branchChart}
            config={BRANCH_CONFIG}
            layout="horizontal"
          />
        </div>
      </div>

      <DashboardPieChart
        title="Discrepancy distribution"
        description="Discrepancies raised from verification, grouped by type."
        data={discrepancyChart}
        config={discrepancyConfig}
      />

      <SectionPanel
        title="Branch verification"
        description={`Active discrepancies: ${h?.open_discrepancies ?? 0}. ${rows.length} session${rows.length === 1 ? '' : 's'} in view.`}
        bodyClassName="pt-2"
      >
        <DataTable
          columns={[
            {
              key: 'branch',
              header: 'Branch',
              render: (row) => (
                <div>
                  <div className="font-semibold">{row.branch}</div>
                  <div className="text-xs text-muted-foreground">{row.campaign_name}</div>
                </div>
              ),
            },
            { key: 'country', header: 'Country', render: (row) => row.country },
            { key: 'officer', header: 'Assigned officer', render: (row) => row.officer },
            { key: 'expected', header: 'Expected', align: 'right', render: (row) => row.expected },
            { key: 'verified', header: 'Verified', align: 'right', render: (row) => row.verified },
            { key: 'found', header: 'Found', align: 'right', render: (row) => row.found },
            { key: 'not_found', header: 'Not found', align: 'right', render: (row) => row.not_found },
            { key: 'wrong', header: 'Wrong loc.', align: 'right', render: (row) => row.wrong_location },
            { key: 'pending', header: 'Pending', align: 'right', render: (row) => row.pending },
            {
              key: 'completion',
              header: 'Completion',
              render: (row) => <ProgressBar value={row.completion} />,
            },
            {
              key: 'status',
              header: 'Session',
              render: (row) => (
                <StatusChip label={readable(row.status)} tone={statusToneFromValue(row.status)} />
              ),
            },
            { key: 'last', header: 'Last verification', render: (row) => shortDate(row.last_verified_at) },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (row) => (
                <PortButton
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={() => router.push(`/inventory/verification/sessions/${row.session_id}`)}
                >
                  <Eye size={14} /> Open
                </PortButton>
              ),
            },
          ]}
          rows={rows}
          rowKey={(row) => row.session_id}
          loading={loading}
          emptyMessage="No verification sessions yet. Create a campaign to generate branch sessions."
        />
      </SectionPanel>
    </div>
  );
}
