'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  DataTable,
  Dropdown,
  ErrorBanner,
  InputField,
  SectionPanel,
  StatCard,
  StatusChip,
  type DataColumn,
} from '@/components/ports';
import AIChart from '@/components/ai/AIChart';

type Report = {
  truncated: boolean;
  totals: {
    requests: number;
    chat_requests: number;
    successful: number;
    failed: number;
    total_tokens: number;
    estimated_cost: number;
    currency: string;
    avg_duration_ms: number;
  };
  by_day: { date: string; requests: number; tokens: number; cost: number }[];
  by_organization: { id: string | null; name: string; requests: number; tokens: number; cost: number }[];
  by_module: { module: string; requests: number }[];
  top_users: { user_id: string; name: string; requests: number }[];
  errors: { category: string; count: number }[];
  feedback: { positive: number; negative: number } | null;
  recent: {
    id: string;
    created_at: string;
    organization: string;
    user: string | null;
    request_type: string;
    module: string | null;
    status: string;
    error_category: string | null;
    total_tokens: number;
    estimated_cost: number;
    duration_ms: number | null;
  }[];
};

function monthStart() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export default function UsageTab({ organizations }: { organizations: { id: string; name: string }[] }) {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [org, setOrg] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ from, to });
    if (org) params.set('organization', org);
    const res = await fetch(`/api/ai/admin/usage?${params}`, { cache: 'no-store' });
    const json = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(json?.error || 'Failed to load usage');
      return;
    }
    setReport(json);
  }, [from, to, org]);

  useEffect(() => {
    void load();
  }, [load]);

  const t = report?.totals;
  const orgColumns: DataColumn<Report['by_organization'][number]>[] = [
    { key: 'name', header: 'Organization' },
    { key: 'requests', header: 'Requests', align: 'right' },
    { key: 'tokens', header: 'Tokens', align: 'right', render: (r) => r.tokens.toLocaleString() },
    { key: 'cost', header: `Est. cost (${t?.currency ?? 'USD'})`, align: 'right', render: (r) => r.cost.toFixed(4) },
  ];
  const recentColumns: DataColumn<Report['recent'][number]>[] = [
    { key: 'created_at', header: 'Time', render: (r) => new Date(r.created_at).toLocaleString() },
    { key: 'organization', header: 'Organization' },
    { key: 'user', header: 'User', render: (r) => r.user ?? '—' },
    { key: 'request_type', header: 'Type' },
    { key: 'module', header: 'Module', render: (r) => r.module ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span title={r.error_category ?? undefined}>
          <StatusChip
            label={r.status === 'failed' && r.error_category ? `failed · ${r.error_category}` : r.status}
            tone={r.status === 'success' ? 'green' : r.status === 'failed' ? 'gold' : 'gray'}
          />
        </span>
      ),
    },
    { key: 'total_tokens', header: 'Tokens', align: 'right' },
    { key: 'duration_ms', header: 'ms', align: 'right', render: (r) => r.duration_ms ?? '—' },
  ];

  return (
    <div className="space-y-4">
      <SectionPanel title="Filters">
        <div className="grid gap-4 md:grid-cols-3">
          <InputField label="From" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          <InputField label="To" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          <Dropdown
            label="Organization"
            value={org}
            onChange={setOrg}
            options={organizations.map((o) => ({ value: o.id, label: o.name }))}
            placeholder="All organizations"
            clearable
          />
        </div>
      </SectionPanel>

      {error && <ErrorBanner message={error} />}
      {report?.truncated && <ErrorBanner message="Showing the most recent 20,000 records only. Narrow the date range for exact totals." />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Chat messages" value={loading ? '…' : (t?.chat_requests ?? 0).toLocaleString()} hint={`${t?.requests ?? 0} provider requests in total`} accent="blue" />
        <StatCard
          label="Success rate"
          value={loading ? '…' : t && t.requests ? `${Math.round((t.successful / t.requests) * 100)}%` : '—'}
          hint={`${t?.failed ?? 0} failed`}
          accent="green"
        />
        <StatCard label="Tokens" value={loading ? '…' : (t?.total_tokens ?? 0).toLocaleString()} hint={`Avg response ${t?.avg_duration_ms ?? 0} ms`} accent="purple" />
        <StatCard
          label="Estimated cost"
          value={loading ? '…' : `${(t?.estimated_cost ?? 0).toFixed(2)} ${t?.currency ?? 'USD'}`}
          hint="From the configured model pricing"
          accent="gold"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionPanel title="Requests per day">
          {report?.by_day.length ? (
            <AIChart
              chart={{
                type: 'line',
                title: 'Requests',
                data: report.by_day.map((d) => ({ label: d.date.slice(5), requests: d.requests })),
                series: [{ key: 'requests', label: 'Requests' }],
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No usage in this range.</p>
          )}
        </SectionPanel>
        <SectionPanel title="By module & errors">
          <div className="space-y-3">
            {report?.by_module.length ? (
              <AIChart
                chart={{
                  type: 'bar',
                  title: 'Chat messages by module',
                  data: report.by_module.map((m) => ({ label: m.module, requests: m.requests })),
                  series: [{ key: 'requests', label: 'Messages' }],
                }}
              />
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              {report?.errors.map((e) => <StatusChip key={e.category} label={`${e.category}: ${e.count}`} tone="gold" />)}
              {report?.feedback && (
                <StatusChip label={`Feedback 👍 ${report.feedback.positive} · 👎 ${report.feedback.negative}`} tone="blue" />
              )}
            </div>
          </div>
        </SectionPanel>
      </div>

      <SectionPanel title="By organization" bodyClassName="p-0">
        <DataTable columns={orgColumns} rows={report?.by_organization ?? []} rowKey={(r) => r.id ?? 'platform'} loading={loading} emptyMessage="No usage in this range." />
      </SectionPanel>

      <SectionPanel title="Recent requests" description="Latest 50 provider requests (no message content is logged here)." bodyClassName="p-0">
        <DataTable columns={recentColumns} rows={report?.recent ?? []} rowKey={(r) => r.id} loading={loading} emptyMessage="No requests." />
      </SectionPanel>
    </div>
  );
}
