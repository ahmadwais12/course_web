'use client';

import React, { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ErrorBanner,
  FormDialog,
  ListPageShell,
  PortButton,
  RowActions,
  StatCard,
  StatusChip,
  statusToneFromValue,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { daysAgo } from '@/components/dashboards/DateFilterBar';
import { Eye, RefreshCw, Trash2 } from 'lucide-react';

type LogItem = {
  id: string;
  created_at: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details?: Record<string, unknown> | null;
  details_summary?: string;
  user_id: string | null;
  user_name: string | null;
  ip_address: string | null;
  user_agent?: string | null;
  tenant_id?: string | null;
};

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

const LIVE_REFRESH_MS = 15_000;

export default function LogsPage() {
  const [items, setItems] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [account, setAccount] = useState('');
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(daysAgo(0));
  const [viewing, setViewing] = useState<LogItem | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  const ACTION_PRESETS = useMemo(
    () =>
      [
        'create',
        'update',
        'soft_delete',
        'restore',
        'purge',
        'insert',
        'delete',
      ].map((s) => ({ value: s, label: labelize(s) })),
    []
  );

  const ENTITY_PRESETS = useMemo(
    () =>
      [
        'user',
        'tenant',
        'role',
        'permission',
        'business_type',
        'business_plan',
        'messaging_type',
      ].map((s) => ({ value: s, label: labelize(s) })),
    []
  );

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('limit', '1000');
      params.set('_', String(Date.now()));
      const res = await fetch(`/api/logs?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load logs');
      const next = Array.isArray(data) ? (data as LogItem[]) : [];
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
      const message = err instanceof Error ? err.message : 'Failed to load logs';
      if (!silent) {
        setItems([]);
        setError(message);
        toast.error(message);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  useLiveRefresh({
    intervalMs: LIVE_REFRESH_MS,
    enabled: !viewing,
    onRefresh: () => load({ silent: true }),
  });

  const filterFn = useCallback(
    (item: LogItem) => {
      const actionOk = !action || item.action === action;
      const entityOk = !entityType || item.entity_type === entityType;
      const accountOk =
        !account || item.user_id === account || item.user_name === account;
      return actionOk && entityOk && accountOk;
    },
    [action, entityType, account]
  );

  const list = useListQuery({
    items: items as (LogItem & Record<string, unknown>)[],
    searchKeys: ['action', 'entity_type', 'user_name', 'details_summary', 'ip_address', 'entity_id'],
    filterKey: `${action}|${entityType}|${account}`,
    filterFn: filterFn as (item: LogItem & Record<string, unknown>) => boolean,
  });

  const stats = useMemo(() => {
    const today = daysAgo(0);
    const creates = items.filter((i) => /create|insert/i.test(i.action)).length;
    const updates = items.filter((i) => /update/i.test(i.action)).length;
    const deletes = items.filter((i) => /soft_delete|purge|delete/i.test(i.action)).length;
    const restores = items.filter((i) => /restore/i.test(i.action)).length;
    const todayCount = items.filter((i) => (i.created_at || '').slice(0, 10) === today).length;
    const accounts = new Set(items.map((i) => i.user_id).filter(Boolean)).size;
    return { creates, updates, deletes, restores, todayCount, accounts, total: items.length };
  }, [items]);

  const actionOptions = useMemo(() => {
    const map = new Map(ACTION_PRESETS.map((o) => [o.value, o]));
    for (const i of items) {
      if (i.action && !map.has(i.action)) {
        map.set(i.action, { value: i.action, label: labelize(i.action) });
      }
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [items, ACTION_PRESETS]);

  const entityOptions = useMemo(() => {
    const map = new Map(ENTITY_PRESETS.map((o) => [o.value, o]));
    for (const i of items) {
      if (i.entity_type && !map.has(i.entity_type)) {
        map.set(i.entity_type, {
          value: i.entity_type,
          label: labelize(i.entity_type),
        });
      }
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [items, ENTITY_PRESETS]);

  const accountOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of items) {
      if (!i.user_id) continue;
      map.set(i.user_id, i.user_name || i.user_id);
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [items]);

  return (
    <div className="space-y-4">
      {error ? <ErrorBanner message={error} /> : null}

      <ListPageShell
        title="Activity Logs"
        description="Live trail of every account create, update, soft delete, restore, and purge across DreamFlow."
        pill={
          loading
            ? 'LOADING…'
            : `LIVE · ${list.total} EVENTS${lastRefreshAt ? ` · ${lastRefreshAt.toLocaleTimeString()}` : ''}`
        }
        filterTitle="Filter activity logs"
        filterDescription="Pick a date range, action, entity, or account — everything lives in this dialog."
        primaryAction={{
          label: loading ? 'Refreshing…' : 'Refresh',
          onClick: () => load(),
        }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search account, action, entity, IP…"
        dateFrom={from}
        dateTo={to}
        onDateRangeChange={({ from: nextFrom, to: nextTo }) => {
          setFrom(nextFrom);
          setTo(nextTo);
        }}
        onResetFilters={() => {
          list.reset();
          setAction('');
          setEntityType('');
          setAccount('');
          setFrom(daysAgo(29));
          setTo(daysAgo(0));
        }}
        filters={[
          {
            key: 'action',
            label: 'Action',
            value: action,
            options: actionOptions,
            onChange: setAction,
          },
          {
            key: 'entity',
            label: 'Entity',
            value: entityType,
            options: entityOptions,
            onChange: setEntityType,
          },
          {
            key: 'account',
            label: 'Account',
            value: account,
            options: accountOptions,
            onChange: setAccount,
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
              const name = row.user_name || row.user_id || 'System';
              return (
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[11px] font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-200">
                    {initials(name)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {row.ip_address || 'No IP recorded'}
                    </div>
                  </div>
                </div>
              );
            },
          },
          {
            key: 'action',
            header: 'Action',
            render: (row) => (
              <StatusChip label={labelize(row.action)} tone={statusToneFromValue(row.action)} />
            ),
          },
          {
            key: 'entity',
            header: 'Entity',
            render: (row) => (
              <div className="min-w-0">
                <div className="font-medium capitalize text-foreground">
                  {row.entity_type ? labelize(row.entity_type) : '—'}
                </div>
                <div className="truncate text-xs font-mono text-muted-foreground">
                  {row.entity_id ? String(row.entity_id).slice(0, 13) : '—'}
                </div>
              </div>
            ),
          },
          {
            key: 'details',
            header: 'Summary',
            render: (row) => (
              <span className="block max-w-[220px] truncate text-sm text-muted-foreground">
                {row.details_summary || '—'}
              </span>
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
        rows={list.rows as LogItem[]}
        rowKey={(row) => row.id}
        loading={loading}
        emptyMessage="No activity in this range. Create, edit, or delete records to populate the trail."
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
            label="Creates"
            value={loading ? '—' : stats.creates}
            hint="Insert / create actions"
            accent="green"
          />
          <StatCard
            label="Updates"
            value={loading ? '—' : stats.updates}
            hint="Profile & record edits"
            accent="gold"
          />
          <StatCard
            label="Deletes / restores"
            value={loading ? '—' : stats.deletes + stats.restores}
            hint={`${stats.deletes} delete · ${stats.restores} restore`}
            accent="purple"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw size={14} className="opacity-70" />
          <span>Table data refreshes every 15s (no full page reload).</span>
          <span className="mx-1 text-border">·</span>
          <Link
            href="/trash"
            className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline"
          >
            <Trash2 size={14} />
            Open Trash
          </Link>
        </div>
      </ListPageShell>

      <FormDialog
        open={Boolean(viewing)}
        title="Log event details"
        onClose={() => setViewing(null)}
        maxWidth="xl"
        footer={
          <PortButton variant="primary" onClick={() => setViewing(null)}>
            Close
          </PortButton>
        }
      >
        {viewing ? (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  When
                </div>
                <div className="mt-1 font-medium">
                  {viewing.created_at
                    ? new Date(viewing.created_at).toLocaleString()
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Account
                </div>
                <div className="mt-1 font-medium">
                  {viewing.user_name || viewing.user_id || 'System'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Action
                </div>
                <div className="mt-1">
                  <StatusChip
                    label={labelize(viewing.action)}
                    tone={statusToneFromValue(viewing.action)}
                  />
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Entity
                </div>
                <div className="mt-1 font-medium capitalize">
                  {viewing.entity_type ? labelize(viewing.entity_type) : '—'}
                </div>
                <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {viewing.entity_id || '—'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  IP address
                </div>
                <div className="mt-1 font-medium">{viewing.ip_address || '—'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  User agent
                </div>
                <div className="mt-1 break-all text-muted-foreground">
                  {viewing.user_agent || '—'}
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Payload
              </div>
              <pre className="mt-2 max-h-64 overflow-auto rounded-xl border border-border bg-muted/50 p-3 text-xs leading-relaxed">
                {JSON.stringify(viewing.details ?? { summary: viewing.details_summary }, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </FormDialog>
    </div>
  );
}
