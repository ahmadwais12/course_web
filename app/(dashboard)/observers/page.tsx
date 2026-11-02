'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Monitor, Smartphone, Tablet } from 'lucide-react';
import {
  DataTable,
  Dropdown,
  ErrorBanner,
  PageHeader,
  PortButton,
  SectionPanel,
  SegmentedControl,
  StatCard,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import DashboardSkeleton from '@/components/dashboards/DashboardSkeleton';

type Overview = {
  definitions?: Record<string, string>;
  today: Metrics;
  week: Metrics;
  month: Metrics;
  period: Metrics;
  allTime: { visitors: number; sessions: number; pageViews: number };
  trend: { day: string; visitors: number; sessions: number; pageViews: number }[];
  surfaces: { web: SurfaceMetrics; app: SurfaceMetrics };
  devices: Record<string, number>;
  sources: { name: string; visitors: number; sessions: number; pageViews: number }[];
  browsers: { name: string; count: number }[];
  operatingSystems: { name: string; count: number }[];
  countries: { name: string; count: number }[];
  landings: { path: string; sessions: number }[];
  topPages: { path: string; views: number; uniqueVisitors: number; sessions: number }[];
  seo: {
    organicVisitors: number;
    organicSessions: number;
    organicPageViews: number;
    organicShare: number;
    note: string;
  };
  geoNote?: string;
  error?: string;
  hint?: string;
};

type Metrics = {
  visitors: number;
  sessions: number;
  pageViews: number;
  avgSessionDurationMs: number;
  engagementRate: number;
};

type SurfaceMetrics = {
  visitors: number;
  sessions: number;
  pageViews: number;
};

type Realtime = {
  activeUsers: number;
  activeSessions: number;
  surfaces?: {
    web: { activeUsers: number; activeSessions: number };
    app: { activeUsers: number; activeSessions: number };
  };
  windowMinutes: number;
  pages: { path: string; count: number }[];
  recent: {
    path: string | null;
    device: string | null;
    browser: string | null;
    source: string | null;
    medium: string | null;
    country: string | null;
    lastActivityAt: string;
  }[];
  error?: string;
};

function formatDuration(ms: number) {
  if (!ms || ms < 1000) return '0s';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

function BarList({
  items,
  valueKey,
}: {
  items: { name: string; value: number }[];
  valueKey?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      )}
      {items.map((i) => (
        <div key={i.name} className="space-y-1">
          <div className="flex justify-between text-xs gap-2">
            <span className="truncate font-medium text-foreground">{i.name}</span>
            <span className="text-muted-foreground shrink-0">
              {i.value}
              {valueKey ? ` ${valueKey}` : ''}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/80"
              style={{ width: `${Math.max(4, (i.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendChart({
  data,
}: {
  data: { day: string; visitors: number; pageViews: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.visitors, d.pageViews)));
  const w = 640;
  const h = 160;
  const pad = 8;
  if (data.length < 2) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Not enough trend points yet.</p>;
  }
  const x = (i: number) => pad + (i * (w - pad * 2)) / (data.length - 1);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const line = (key: 'visitors' | 'pageViews') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d[key])}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40 text-primary" role="img" aria-label="Traffic trend">
      <path d={line('pageViews')} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth={2} />
      <path d={line('visitors')} fill="none" stroke="currentColor" strokeWidth={2.5} />
    </svg>
  );
}

export default function ObserversAnalyticsPage() {
  const router = useRouter();
  const [range, setRange] = useState('30d');
  const [surface, setSurface] = useState<'web' | 'app' | 'all'>('web');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [realtime, setRealtime] = useState<Realtime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorHint(null);
    try {
      const [oRes, rRes] = await Promise.all([
        fetch(`/api/analytics/overview?range=${range}&surface=${surface}`),
        fetch(`/api/analytics/realtime?surface=${surface}`),
      ]);
      const oData = await oRes.json();
      const rData = await rRes.json();
      if (!oRes.ok) {
        setErrorHint(oData.hint || null);
        throw new Error(oData.error || oData.hint || 'Failed to load analytics');
      }
      setOverview(oData);
      setRealtime(rRes.ok ? rData : null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load';
      setError(message);
      setOverview(null);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [range, surface]);

  useEffect(() => {
    load();
    const t = window.setInterval(load, 60_000);
    return () => window.clearInterval(t);
  }, [load]);

  const deviceTotal = useMemo(() => {
    if (!overview) return 1;
    return Math.max(
      1,
      (overview.devices.desktop || 0) +
        (overview.devices.mobile || 0) +
        (overview.devices.tablet || 0) +
        (overview.devices.unknown || 0)
    );
  }, [overview]);

  const surfaceTotal = useMemo(() => {
    if (!overview) return 1;
    return Math.max(1, (overview.surfaces?.web.visitors ?? 0) + (overview.surfaces?.app.visitors ?? 0));
  }, [overview]);

  const ranges = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
    { value: '12m', label: '12 months' },
  ];

  return (
    <div className="space-y-4 animate-fade-up">
      <PageHeader
        title="Observers — Website & App Analytics"
        description={`First-party traffic for the website and the Flutter mobile app. Active user = activity in the last ${realtime?.windowMinutes ?? 5} minutes.`}
        pill={loading ? 'LOADING…' : 'LIVE DATA'}
        pillTone={loading ? 'neutral' : 'live'}
        actions={
          <div className="flex flex-wrap gap-2">
            <PortButton variant="secondary" onClick={() => router.push('/observers/directory')}>
              Account directory
            </PortButton>
            <PortButton variant="ghost" onClick={load} disabled={loading}>
              Refresh
            </PortButton>
          </div>
        }
      />

      <SectionPanel title="Filters" description="Choose the surface and date range.">
        <div className="flex flex-wrap items-end gap-3">
          <Dropdown
            label="Surface"
            value={surface}
            onChange={(value) => setSurface(value as 'web' | 'app' | 'all')}
            options={[
              { value: 'web', label: 'Website (public)' },
              { value: 'app', label: 'Mobile app (Flutter)' },
              { value: 'all', label: 'All surfaces' },
            ]}
          />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">Range</p>
            <SegmentedControl value={range} onChange={setRange} options={ranges} />
          </div>
        </div>
      </SectionPanel>

      {error && <ErrorBanner message={errorHint ? `${error} ${errorHint}` : error} />}

      {loading && !overview ? (
        <DashboardSkeleton />
      ) : overview ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Active now"
              value={realtime?.activeUsers ?? 0}
              hint={`${realtime?.activeSessions ?? 0} sessions`}
              valueClassName="text-emerald-500"
            />
            <StatCard label="Today visitors" value={overview.today.visitors} hint={`${overview.today.pageViews} views`} />
            <StatCard label="This month" value={overview.month.visitors} hint={`${overview.month.sessions} sessions`} />
            <StatCard
              label="All time"
              value={overview.allTime.visitors}
              hint={`${overview.allTime.pageViews} page views`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Period sessions"
              value={overview.period.sessions}
              hint={ranges.find((r) => r.value === range)?.label}
            />
            <StatCard label="Period page views" value={overview.period.pageViews} />
            <StatCard
              label="Avg session"
              value={formatDuration(overview.period.avgSessionDurationMs)}
              valueClassName="text-[20px]"
            />
            <StatCard
              label="Engagement rate"
              value={`${overview.period.engagementRate}%`}
              hint=">1 page or ≥10s"
              valueClassName="text-[20px]"
            />
          </div>

          <SectionPanel
            title="Website vs mobile app"
            description="Website = public website visitors. Mobile app = Flutter app traffic reported with surface “app”."
            headerRight={
              <span className="text-xs text-muted-foreground">
                {ranges.find((r) => r.value === range)?.label} ·{' '}
                {(overview.surfaces?.web.visitors ?? 0) + (overview.surfaces?.app.visitors ?? 0)} total visitors
              </span>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'web' as const, label: 'Website (public)', icon: Globe, data: overview.surfaces?.web },
                { key: 'app' as const, label: 'Mobile app (Flutter)', icon: Smartphone, data: overview.surfaces?.app },
              ].map(({ key, label, icon: Icon, data }) => {
                const visitors = data?.visitors ?? 0;
                const pct = Math.round((visitors / surfaceTotal) * 100);
                const live = realtime?.surfaces?.[key]?.activeUsers ?? 0;
                return (
                  <div key={key} className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Icon size={16} className="text-muted-foreground" />
                      {label}
                      {live > 0 && (
                        <span className="ml-auto text-[10px] text-emerald-500">{live} live</span>
                      )}
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <span className="text-2xl font-bold">{visitors}</span>
                      <span className="text-xs text-muted-foreground">
                        {data?.sessions ?? 0} sessions · {data?.pageViews ?? 0} views
                      </span>
                    </div>
                    <div className="h-2 mt-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary/80" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{pct}% of visitors</div>
                  </div>
                );
              })}
            </div>
          </SectionPanel>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SectionPanel
              className="lg:col-span-2"
              title="Traffic trend"
              description="Solid = visitors · Faded = page views"
            >
              <TrendChart data={overview.trend} />
            </SectionPanel>

            <SectionPanel
              title="Devices"
              description={`Unique visitors · ${ranges.find((r) => r.value === range)?.label}`}
            >
              {[
                { key: 'desktop', label: 'Desktop', icon: Monitor },
                { key: 'mobile', label: 'Mobile', icon: Smartphone },
                { key: 'tablet', label: 'Tablet', icon: Tablet },
              ].map(({ key, label, icon: Icon }) => {
                const count = overview.devices[key] || 0;
                const pct = Math.round((count / deviceTotal) * 100);
                return (
                  <div key={key} className="flex items-center gap-3">
                    <Icon size={18} className="text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span>{label}</span>
                        <span className="text-muted-foreground">
                          {count} · {pct}%
                        </span>
                      </div>
                      <div className="h-2 mt-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary/80" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </SectionPanel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionPanel title="Top pages">
              <DataTable
                columns={[
                  {
                    key: 'rank',
                    header: '#',
                    render: (_row, i) => i + 1,
                  },
                  {
                    key: 'path',
                    header: 'Path',
                    render: (p) => <span className="font-mono text-xs">{p.path}</span>,
                  },
                  { key: 'views', header: 'Views' },
                  { key: 'uniqueVisitors', header: 'Uniques' },
                ]}
                rows={overview.topPages}
                rowKey={(p) => p.path}
                emptyMessage="No page views yet — open the public homepage to generate traffic."
              />
            </SectionPanel>

            <SectionPanel title="Traffic sources">
              <BarList
                items={overview.sources.map((s) => ({ name: s.name, value: s.sessions }))}
                valueKey="sessions"
              />
            </SectionPanel>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SectionPanel title="Browsers">
              <BarList items={overview.browsers.map((b) => ({ name: b.name, value: b.count }))} />
            </SectionPanel>
            <SectionPanel title="Operating systems">
              <BarList
                items={overview.operatingSystems.map((b) => ({ name: b.name, value: b.count }))}
              />
            </SectionPanel>
            <SectionPanel title="Countries" description={overview.geoNote}>
              <BarList items={overview.countries.slice(0, 8).map((c) => ({ name: c.name, value: c.count }))} />
            </SectionPanel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionPanel title="SEO traffic (first-party)" description={overview.seo.note}>
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Organic sessions" value={overview.seo.organicSessions} />
                <StatCard label="Organic share" value={`${overview.seo.organicShare}%`} valueClassName="text-[20px]" />
                <StatCard label="Organic visitors" value={overview.seo.organicVisitors} />
                <StatCard label="Organic page views" value={overview.seo.organicPageViews} />
              </div>
              <h3 className="mt-4 mb-2 text-sm font-semibold">Top landing pages</h3>
              <BarList
                items={overview.landings.slice(0, 8).map((l) => ({ name: l.path, value: l.sessions }))}
                valueKey="entries"
              />
            </SectionPanel>

            <SectionPanel
              title="Realtime"
              description={`${realtime?.activeUsers ?? 0} active visitors · ${realtime?.activeSessions ?? 0} sessions. Website ${realtime?.surfaces?.web.activeUsers ?? 0} · Mobile app ${realtime?.surfaces?.app.activeUsers ?? 0}`}
            >
              <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Live pages</h3>
              <BarList
                items={(realtime?.pages || []).map((p) => ({ name: p.path, value: p.count }))}
              />
              <h3 className="mb-2 mt-4 text-xs font-semibold uppercase text-muted-foreground">Recent</h3>
              <ul className="max-h-56 space-y-2 overflow-y-auto text-sm">
                {(realtime?.recent || []).map((r, i) => (
                  <li key={`${r.lastActivityAt}-${i}`} className="border-b border-border pb-2">
                    <div className="font-mono text-xs">{r.path}</div>
                    <div className="text-xs text-muted-foreground">
                      {[r.device, r.browser, r.source, r.country].filter(Boolean).join(' · ')}
                    </div>
                  </li>
                ))}
                {!realtime?.recent?.length && (
                  <li className="text-sm text-muted-foreground">No active sessions in the window.</li>
                )}
              </ul>
            </SectionPanel>
          </div>
        </>
      ) : null}
    </div>
  );
}
