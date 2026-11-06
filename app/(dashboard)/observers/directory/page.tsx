'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import {
  ErrorBanner,
  ListPageShell,
  StatCard,
  StatusChip,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';

type VisitorSession = {
  id: string;
  visitorId: string;
  anonymousId: string | null;
  isReturning: boolean;
  startedAt: string;
  lastActivityAt: string;
  durationMs: number;
  pageCount: number;
  device: string;
  browser: string | null;
  os: string | null;
  source: string | null;
  medium: string | null;
  landingPath: string | null;
  exitPath: string | null;
  country: string | null;
  language: string | null;
  screen: string | null;
  surface: string;
  referrer: string | null;
};

type SessionsResponse = {
  total: number;
  page: number;
  perPage: number;
  uniqueVisitors: number;
  devices: { desktop: number; mobile: number; tablet: number; unknown: number };
  clients?: { web: number; app: number; desktop: number };
  rows: VisitorSession[];
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

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function deviceTone(device: string): 'blue' | 'green' | 'gold' | 'gray' {
  if (device === 'desktop') return 'blue';
  if (device === 'mobile') return 'green';
  if (device === 'tablet') return 'gold';
  return 'gray';
}

function DeviceIcon({ device }: { device: string }) {
  if (device === 'mobile') return <Smartphone size={14} className="shrink-0" />;
  if (device === 'tablet') return <Tablet size={14} className="shrink-0" />;
  return <Monitor size={14} className="shrink-0" />;
}

/** System Viewer visitors — who opened the site, on desktop or mobile, with session details. */
export default function SystemViewerVisitorsPage() {
  const [range, setRange] = useState('30d');
  const [surface, setSurface] = useState('all');
  const [device, setDevice] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SessionsResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        range,
        surface,
        page: String(page),
        perPage: String(perPage),
      });
      if (device) params.set('device', device);
      if (search.trim()) params.set('q', search.trim());
      const res = await fetch(`/api/analytics/sessions?${params}`);
      const json = (await res.json()) as SessionsResponse;
      if (!res.ok) throw new Error(json.error || 'Failed to load visitors');
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load visitors';
      setError(message);
      setData(null);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [range, surface, device, search, page, perPage]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [range, surface, device, search]);

  const ranges = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
    { value: '12m', label: '12 months' },
  ];

  const devices = data?.devices || { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
  const clients = data?.clients || { web: 0, app: 0, desktop: 0 };

  return (
    <ListPageShell
      title="System Viewer — Visitors"
      description="Who opened the website, mobile app, or desktop EXE, with browser/OS, path, and session details."
      pill="LIVE DATA"
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search path, browser, OS, source, visitor…"
      onResetFilters={() => {
        setSearch('');
        setDevice('');
        setSurface('all');
        setRange('30d');
        setPage(1);
      }}
      filters={[
        {
          key: 'surface',
          label: 'Client',
          value: surface,
          options: [
            { value: 'all', label: 'All clients' },
            { value: 'web', label: 'Website (browser)' },
            { value: 'app', label: 'Mobile app' },
            { value: 'desktop', label: 'Desktop app (EXE)' },
          ],
          onChange: setSurface,
        },
        {
          key: 'device',
          label: 'Browser screen',
          value: device,
          options: [
            { value: 'desktop', label: 'PC browser' },
            { value: 'mobile', label: 'Phone browser' },
            { value: 'tablet', label: 'Tablet browser' },
            { value: 'unknown', label: 'Unknown' },
          ],
          onChange: setDevice,
        },
        {
          key: 'range',
          label: 'Range',
          value: range,
          options: ranges,
          onChange: setRange,
        },
      ]}
      loading={loading}
      columns={[
        {
          key: 'visitor',
          header: 'Visitor',
          render: (r) => (
            <div className="min-w-0">
              <div className="truncate font-mono text-xs font-semibold">
                {(r.anonymousId || r.visitorId).slice(0, 12)}…
              </div>
              <div className="text-[11px] text-muted-foreground">
                {r.isReturning ? 'Returning' : 'New'} ·{' '}
                {r.surface === 'desktop'
                  ? 'Desktop EXE'
                  : r.surface === 'app'
                    ? 'Mobile app'
                    : 'Website'}
              </div>
            </div>
          ),
        },
        {
          key: 'surface',
          header: 'Client',
          render: (r) => {
            const label =
              r.surface === 'desktop'
                ? 'Desktop EXE'
                : r.surface === 'app'
                  ? 'Mobile app'
                  : 'Website';
            const tone =
              r.surface === 'desktop' ? 'blue' : r.surface === 'app' ? 'green' : 'purple';
            return <StatusChip label={label} tone={tone} />;
          },
        },
        {
          key: 'device',
          header: 'Screen',
          render: (r) => (
            <span className="inline-flex items-center gap-1.5">
              <DeviceIcon device={r.device} />
              <StatusChip
                label={
                  r.surface === 'desktop'
                    ? 'EXE'
                    : r.device === 'desktop'
                      ? 'PC browser'
                      : r.device === 'mobile'
                        ? 'Phone'
                        : r.device === 'tablet'
                          ? 'Tablet'
                          : r.device
                }
                tone={deviceTone(r.device)}
              />
            </span>
          ),
        },
        {
          key: 'client',
          header: 'Browser / OS',
          render: (r) => (
            <div>
              <div className="text-sm">{r.browser || '—'}</div>
              <div className="text-xs text-muted-foreground">{r.os || '—'}</div>
            </div>
          ),
        },
        {
          key: 'paths',
          header: 'Landing → Exit',
          render: (r) => (
            <div className="max-w-[220px]">
              <div className="truncate font-mono text-xs">{r.landingPath || '—'}</div>
              <div className="truncate font-mono text-[11px] text-muted-foreground">
                → {r.exitPath || '—'}
              </div>
            </div>
          ),
        },
        {
          key: 'pageCount',
          header: 'Pages',
          render: (r) => r.pageCount,
        },
        {
          key: 'durationMs',
          header: 'Duration',
          render: (r) => formatDuration(r.durationMs),
        },
        {
          key: 'source',
          header: 'Source',
          render: (r) => (
            <div className="text-xs">
              <div>{r.source || 'direct'}</div>
              {r.country ? <div className="text-muted-foreground">{r.country}</div> : null}
            </div>
          ),
        },
        {
          key: 'lastActivityAt',
          header: 'Last activity',
          render: (r) => (
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {formatWhen(r.lastActivityAt)}
            </span>
          ),
        },
      ]}
      rows={data?.rows ?? []}
      rowKey={(row) => row.id}
      page={page}
      perPage={perPage}
      total={data?.total ?? 0}
      onPageChange={setPage}
      onPerPageChange={(next) => {
        setPerPage(next);
        setPage(1);
      }}
      emptyMessage="No visitors yet. Open the public website to generate traffic."
    >
      {error ? <ErrorBanner message={error} /> : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Unique visitors"
          value={data?.uniqueVisitors ?? 0}
          hint={ranges.find((item) => item.value === range)?.label}
          valueClassName="text-sky-500"
        />
        <StatCard label="Sessions" value={data?.total ?? 0} hint="In this filter" />
        <StatCard label="Website" value={clients.web} hint="Browser visits" />
        <StatCard
          label="Mobile app"
          value={clients.app}
          hint="Phone / tablet app"
          valueClassName="text-emerald-500"
        />
        <StatCard
          label="Desktop EXE"
          value={clients.desktop}
          hint="Windows desktop app"
          valueClassName="text-[20px]"
        />
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <StatCard label="PC browsers" value={devices.desktop} hint="Website on a computer" />
        <StatCard label="Phone browsers" value={devices.mobile} hint="Website on a phone" />
        <StatCard label="Tablet browsers" value={devices.tablet} hint="Website on a tablet" />
      </div>
    </ListPageShell>
  );
}
