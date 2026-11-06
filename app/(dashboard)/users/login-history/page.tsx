'use client';

import React, { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ErrorBanner,
  FormDialog,
  ListPageShell,
  PortButton,
  StatCard,
  StatusChip,
  RowActions,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { daysAgo } from '@/components/dashboards/DateFilterBar';
import type { LoginEventType, LoginHistoryRow } from '@/lib/login-history';
import { Eye } from 'lucide-react';

type LoginItem = LoginHistoryRow & { user_name?: string | null };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function relativeTime(iso: string | null) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '—';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 14) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function labelize(value: string) {
  return value.replace(/_/g, ' ');
}

function eventTone(event: string): 'green' | 'gray' | 'purple' | 'blue' {
  if (event === 'login') return 'green';
  if (event === 'logout') return 'gray';
  if (event === 'failed_login') return 'purple';
  return 'blue';
}

const EVENT_PRESETS: { value: LoginEventType; label: string }[] = [
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'failed_login', label: 'Failed login' },
];

const LIVE_REFRESH_MS = 20_000;

export default function LoginHistoryPage() {
  const [items, setItems] = useState<LoginItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventType, setEventType] = useState('');
  const [account, setAccount] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(daysAgo(0));
  const [viewing, setViewing] = useState<LoginItem | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);
      if (!silent) setLoading(true);
      try {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        if (eventType) params.set('event_type', eventType);
        params.set('limit', '1000');
        params.set('_', String(Date.now()));
        const res = await fetch(`/api/users/login-history?${params.toString()}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load login history');
        const next = Array.isArray(data) ? (data as LoginItem[]) : [];
        const apply = () => {
          setItems((prev) => {
            const prevKey = prev.map((r) => `${r.id}:${r.created_at}`).join('|');
            const nextKey = next.map((r) => `${r.id}:${r.created_at}`).join('|');
            return prevKey === nextKey ? prev : next;
          });
          setError(null);
          setLastRefreshAt(new Date());
        };
        if (silent) startTransition(apply);
        else apply();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load login history';
        if (!silent) {
          setItems([]);
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [from, to, eventType]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useLiveRefresh({
    intervalMs: LIVE_REFRESH_MS,
    enabled: !viewing,
    onRefresh: () => load({ silent: true }),
  });

  const filterFn = useCallback(
    (item: LoginItem) => {
      const accountOk =
        !account ||
        item.user_id === account ||
        item.user_name === account ||
        item.email === account;
      const deviceOk = !deviceType || item.device_type === deviceType;
      return accountOk && deviceOk;
    },
    [account, deviceType]
  );

  const list = useListQuery({
    items: items as (LoginItem & Record<string, unknown>)[],
    searchKeys: [
      'email',
      'user_name',
      'ip_address',
      'device_name',
      'browser',
      'os',
      'event_type',
      'location',
    ],
    filterKey: `${account}|${deviceType}`,
    filterFn: filterFn as (item: LoginItem & Record<string, unknown>) => boolean,
  });

  const stats = useMemo(() => {
    const today = daysAgo(0);
    const logins = items.filter((i) => i.event_type === 'login').length;
    const logouts = items.filter((i) => i.event_type === 'logout').length;
    const failed = items.filter((i) => i.event_type === 'failed_login').length;
    const todayCount = items.filter((i) => (i.created_at || '').slice(0, 10) === today).length;
    const accounts = new Set(
      items.map((i) => i.user_id || i.email).filter(Boolean)
    ).size;
    return { logins, logouts, failed, todayCount, accounts, total: items.length };
  }, [items]);

  const accountOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of items) {
      const key = i.user_id || i.email;
      if (!key) continue;
      map.set(key, i.user_name || i.email || key);
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [items]);

  const deviceOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of items) {
      if (!i.device_type) continue;
      map.set(i.device_type, labelize(i.device_type));
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [items]);

  return (
    <div className="space-y-4">
      {error ? <ErrorBanner message={error} /> : null}

      <ListPageShell
        title="Login History"
        description="Review sign-in history by user, device, and IP address — successful logins, logouts, and failed attempts."
        pill={
          loading
            ? 'LOADING…'
            : `LIVE · ${list.total} EVENTS${lastRefreshAt ? ` · ${lastRefreshAt.toLocaleTimeString()}` : ''}`
        }
        filterTitle="Filter login history"
        filterDescription="Narrow by date range, event type, account, or device."
        primaryAction={{
          label: loading ? 'Refreshing…' : 'Refresh',
          onClick: () => load(),
        }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search user, email, IP, device…"
        dateFrom={from}
        dateTo={to}
        onDateRangeChange={({ from: nextFrom, to: nextTo }) => {
          setFrom(nextFrom);
          setTo(nextTo);
        }}
        onResetFilters={() => {
          list.reset();
          setEventType('');
          setAccount('');
          setDeviceType('');
          setFrom(daysAgo(29));
          setTo(daysAgo(0));
        }}
        filters={[
          {
            key: 'event',
            label: 'Event',
            value: eventType,
            options: EVENT_PRESETS,
            onChange: setEventType,
          },
          {
            key: 'account',
            label: 'Account',
            value: account,
            options: accountOptions,
            onChange: setAccount,
          },
          {
            key: 'device',
            label: 'Device',
            value: deviceType,
            options: deviceOptions,
            onChange: setDeviceType,
          },
        ]}
        columns={[
          {
            key: 'when',
            header: 'When',
            render: (row) => (
              <div>
                <div className="font-medium text-foreground">{relativeTime(row.created_at)}</div>
                <div className="text-xs text-muted-foreground">
                  {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                </div>
              </div>
            ),
          },
          {
            key: 'user',
            header: 'Account',
            render: (row) => {
              const name = row.user_name || row.email || 'Unknown';
              return (
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[11px] font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-200">
                    {initials(name)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {row.email || row.user_id || '—'}
                    </div>
                  </div>
                </div>
              );
            },
          },
          {
            key: 'event',
            header: 'Event',
            render: (row) => (
              <StatusChip label={labelize(row.event_type)} tone={eventTone(row.event_type)} />
            ),
          },
          {
            key: 'device',
            header: 'Device',
            render: (row) => (
              <div className="min-w-0">
                <div className="truncate font-medium capitalize text-foreground">
                  {row.device_type ? labelize(row.device_type) : '—'}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {row.device_name || row.browser || row.os || '—'}
                </div>
              </div>
            ),
          },
          {
            key: 'ip',
            header: 'IP / Location',
            render: (row) => (
              <div className="min-w-0">
                <div className="font-mono text-sm text-foreground">{row.ip_address || '—'}</div>
                <div className="truncate text-xs text-muted-foreground">{row.location || '—'}</div>
              </div>
            ),
          },
          {
            key: 'actions',
            header: '',
            className: 'w-16 text-end',
            render: (row) => (
              <RowActions
                items={[
                  {
                    key: 'view',
                    label: 'View details',
                    icon: <Eye size={16} />,
                    onClick: () => setViewing(row),
                  },
                ]}
              />
            ),
          },
        ]}
        rows={list.rows as LoginItem[]}
        rowKey={(row) => row.id}
        loading={loading}
        emptyMessage="No sign-in events in this range. Log in or out to populate history."
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Events"
            value={loading ? '—' : stats.total}
            hint={`${stats.todayCount} today · ${stats.accounts} accounts`}
            accent="blue"
          />
          <StatCard
            label="Successful logins"
            value={loading ? '—' : stats.logins}
            hint={`${stats.logouts} logouts`}
            accent="green"
          />
          <StatCard
            label="Failed attempts"
            value={loading ? '—' : stats.failed}
            hint={stats.failed ? 'Review suspicious IPs' : 'No failures in range'}
            accent="gold"
          />
          <StatCard
            label="Unique accounts"
            value={loading ? '—' : stats.accounts}
            hint="Users with any event"
            accent="purple"
          />
        </div>
      </ListPageShell>

      <FormDialog
        open={Boolean(viewing)}
        title="Login event details"
        onClose={() => setViewing(null)}
        maxWidth="xl"
        footer={
          <PortButton variant="primary" onClick={() => setViewing(null)}>
            Close
          </PortButton>
        }
      >
        {viewing ? (
          <div className="space-y-3 text-sm">
            <DetailRow label="When" value={new Date(viewing.created_at).toLocaleString()} />
            <DetailRow label="Account" value={viewing.user_name || viewing.email || '—'} />
            <DetailRow label="Email" value={viewing.email || '—'} />
            <DetailRow label="Event" value={labelize(viewing.event_type)} />
            <DetailRow label="Success" value={viewing.success ? 'Yes' : 'No'} />
            <DetailRow label="IP address" value={viewing.ip_address || '—'} />
            <DetailRow label="Location" value={viewing.location || '—'} />
            <DetailRow label="Device" value={viewing.device_type || '—'} />
            <DetailRow label="Browser" value={viewing.browser || '—'} />
            <DetailRow label="OS" value={viewing.os || '—'} />
            <DetailRow label="User agent" value={viewing.user_agent || '—'} />
            {viewing.details && Object.keys(viewing.details).length > 0 ? (
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Details
                </div>
                <pre className="overflow-auto rounded-xl border border-border bg-muted/40 p-3 text-xs">
                  {JSON.stringify(viewing.details, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </FormDialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-end font-medium text-foreground break-all">{value}</span>
    </div>
  );
}
