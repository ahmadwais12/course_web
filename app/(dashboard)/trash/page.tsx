'use client';

import React, { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  ListPageShell,
  PortButton,
  RowActions,
  StatCard,
  StatusChip,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { daysAgo } from '@/components/dashboards/DateFilterBar';
import { Eye, RefreshCw, RotateCcw, ScrollText, Trash2 } from 'lucide-react';

type TrashItem = {
  id: string;
  entity_type: string;
  entity_label: string;
  entity_id: string;
  display_name: string;
  deleted_at: string | null;
  deleted_by_name: string | null;
  deleted_by: string | null;
  snapshot?: Record<string, unknown> | null;
};

function daysInTrash(iso: string | null) {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function ageLabel(iso: string | null) {
  const days = daysInTrash(iso);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function rowKeyOf(row: TrashItem) {
  return `${row.entity_type}:${row.entity_id}`;
}

const LIVE_REFRESH_MS = 15_000;

export default function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityType, setEntityType] = useState('');
  const [deletedBy, setDeletedBy] = useState('');
  const [from, setFrom] = useState(daysAgo(364));
  const [to, setTo] = useState(daysAgo(0));
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const ENTITY_PRESETS = useMemo(
    () =>
      [
        { value: 'user', label: 'User' },
        { value: 'tenant', label: 'Business' },
        { value: 'role', label: 'Role' },
        { value: 'permission', label: 'Permission' },
        { value: 'business_type', label: 'Business Type' },
        { value: 'business_plan', label: 'Plan' },
        { value: 'messaging_type', label: 'Messaging Type' },
      ] as const,
    []
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<TrashItem | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<TrashItem | TrashItem[] | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/trash?limit=1000&_=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load trash');
      const next = Array.isArray(data) ? (data as TrashItem[]) : [];
      const apply = () => {
        setItems((prev) => {
          const prevKey = prev
            .map((r) => `${rowKeyOf(r)}:${r.deleted_at}:${r.display_name}`)
            .join('|');
          const nextKey = next
            .map((r) => `${rowKeyOf(r)}:${r.deleted_at}:${r.display_name}`)
            .join('|');
          return prevKey === nextKey ? prev : next;
        });
        setError(null);
        setLastRefreshAt(new Date());
        if (!silent) {
          setSelected(new Set());
        } else {
          const alive = new Set(next.map(rowKeyOf));
          setSelected((prev) => {
            const kept = [...prev].filter((key) => alive.has(key));
            return kept.length === prev.size ? prev : new Set(kept);
          });
        }
      };
      if (silent) startTransition(apply);
      else apply();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load trash';
      if (!silent) {
        setItems([]);
        setError(message);
        toast.error(message);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useLiveRefresh({
    intervalMs: LIVE_REFRESH_MS,
    enabled: !viewing && !purgeTarget && !busyKey,
    onRefresh: () => load({ silent: true }),
  });

  const filterFn = useCallback(
    (item: TrashItem) => {
      const typeOk = !entityType || item.entity_type === entityType;
      const byOk =
        !deletedBy ||
        item.deleted_by === deletedBy ||
        item.deleted_by_name === deletedBy;
      const date = String(item.deleted_at || '').slice(0, 10);
      const fromOk = !from || !date || date >= from;
      const toOk = !to || !date || date <= to;
      return typeOk && byOk && fromOk && toOk;
    },
    [entityType, deletedBy, from, to]
  );

  const list = useListQuery({
    items: items as (TrashItem & Record<string, unknown>)[],
    searchKeys: ['display_name', 'entity_type', 'entity_label', 'deleted_by_name', 'entity_id'],
    filterKey: `${entityType}|${deletedBy}|${from}|${to}`,
    filterFn: filterFn as (item: TrashItem & Record<string, unknown>) => boolean,
  });

  const entityOptions = useMemo(() => {
    const map = new Map<string, string>(ENTITY_PRESETS.map((o) => [o.value, o.label]));
    for (const item of items) {
      if (!map.has(item.entity_type)) {
        map.set(item.entity_type, item.entity_label || item.entity_type.replace(/_/g, ' '));
      }
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [items, ENTITY_PRESETS]);

  const deletedByOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (!item.deleted_by) continue;
      map.set(item.deleted_by, item.deleted_by_name || item.deleted_by);
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [items]);

  const stats = useMemo(() => {
    const today = daysAgo(0);
    const byType = new Map<string, number>();
    let todayCount = 0;
    let olderThan7 = 0;
    for (const item of items) {
      byType.set(item.entity_type, (byType.get(item.entity_type) || 0) + 1);
      if ((item.deleted_at || '').slice(0, 10) === today) todayCount += 1;
      if (daysInTrash(item.deleted_at) >= 7) olderThan7 += 1;
    }
    const topType = [...byType.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      total: items.length,
      types: byType.size,
      todayCount,
      olderThan7,
      topTypeLabel: topType
        ? items.find((i) => i.entity_type === topType[0])?.entity_label || topType[0]
        : '—',
      topTypeCount: topType?.[1] ?? 0,
    };
  }, [items]);

  const toggleRow = (row: TrashItem) => {
    const key = rowKeyOf(row);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const togglePage = () => {
    const keys = (list.rows as TrashItem[]).map(rowKeyOf);
    const allSelected = keys.length > 0 && keys.every((k) => selected.has(k));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) keys.forEach((k) => next.delete(k));
      else keys.forEach((k) => next.add(k));
      return next;
    });
  };

  const selectedRows = useMemo(
    () => items.filter((row) => selected.has(rowKeyOf(row))),
    [items, selected]
  );

  const restoreOne = async (row: TrashItem) => {
    const key = `restore:${rowKeyOf(row)}`;
    setBusyKey(key);
    try {
      const res = await fetch('/api/trash/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_type: row.entity_type, entity_id: row.entity_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');
      toast.success(`Restored “${row.display_name}”`);
      await load({ silent: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setBusyKey(null);
    }
  };

  const restoreSelected = async () => {
    if (!selectedRows.length) return;
    setBusyKey('bulk-restore');
    let ok = 0;
    let fail = 0;
    for (const row of selectedRows) {
      try {
        const res = await fetch('/api/trash/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity_type: row.entity_type, entity_id: row.entity_id }),
        });
        if (!res.ok) throw new Error('fail');
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setBusyKey(null);
    if (ok) toast.success(`Restored ${ok} item${ok === 1 ? '' : 's'}`);
    if (fail) toast.error(`${fail} restore${fail === 1 ? '' : 's'} failed`);
    await load({ silent: true });
  };

  const purgeRows = async (rows: TrashItem[]) => {
    setBusyKey('bulk-purge');
    let ok = 0;
    let fail = 0;
    for (const row of rows) {
      try {
        const res = await fetch('/api/trash/purge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity_type: row.entity_type, entity_id: row.entity_id }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'fail');
        }
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setBusyKey(null);
    setPurgeTarget(null);
    if (ok) toast.success(`Permanently deleted ${ok} item${ok === 1 ? '' : 's'}`);
    if (fail) toast.error(`${fail} purge${fail === 1 ? '' : 's'} failed`);
    await load({ silent: true });
  };

  const pageKeys = (list.rows as TrashItem[]).map(rowKeyOf);
  const pageAllSelected = pageKeys.length > 0 && pageKeys.every((k) => selected.has(k));

  return (
    <div className="space-y-4">
      {error ? <ErrorBanner message={error} /> : null}

      <ListPageShell
        title="Trash"
        description="Soft-deleted records wait here. Restore them back into the app, or purge them forever."
        pill={
          loading
            ? 'LOADING…'
            : `LIVE · ${list.total} IN TRASH${lastRefreshAt ? ` · ${lastRefreshAt.toLocaleTimeString()}` : ''}`
        }
        filterTitle="Filter trash"
        filterDescription="Choose date range, type, and who deleted the record — all filters are in this dialog."
        primaryAction={{
          label: loading ? 'Refreshing…' : 'Refresh',
          onClick: () => load(),
        }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search name, type, deleted by…"
        dateFrom={from}
        dateTo={to}
        onDateRangeChange={({ from: nextFrom, to: nextTo }) => {
          setFrom(nextFrom);
          setTo(nextTo);
        }}
        onResetFilters={() => {
          list.reset();
          setEntityType('');
          setDeletedBy('');
          setFrom(daysAgo(364));
          setTo(daysAgo(0));
          setSelected(new Set());
        }}
        filters={[
          {
            key: 'entity',
            label: 'Type',
            value: entityType,
            options: entityOptions,
            onChange: setEntityType,
          },
          {
            key: 'deleted_by',
            label: 'Deleted by',
            value: deletedBy,
            options: deletedByOptions,
            onChange: setDeletedBy,
          },
        ]}
        columns={[
          {
            key: 'select',
            header: '',
            className: 'w-10',
            render: (row) => (
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={selected.has(rowKeyOf(row))}
                onChange={() => toggleRow(row)}
                aria-label={`Select ${row.display_name}`}
              />
            ),
          },
          {
            key: 'name',
            header: 'Name',
            render: (row) => (
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                  {initials(row.display_name || row.entity_label)}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{row.display_name}</div>
                  <div className="truncate text-xs font-mono text-muted-foreground">
                    {row.entity_id.slice(0, 13)}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: 'type',
            header: 'Type',
            render: (row) => <StatusChip label={row.entity_label} tone="gray" />,
          },
          {
            key: 'deleted_by',
            header: 'Deleted by',
            render: (row) => row.deleted_by_name || row.deleted_by || '—',
          },
          {
            key: 'age',
            header: 'In trash',
            render: (row) => (
              <div>
                <div className="font-medium text-foreground">{ageLabel(row.deleted_at)}</div>
                <div className="text-xs text-muted-foreground">
                  {row.deleted_at ? new Date(row.deleted_at).toLocaleString() : '—'}
                </div>
              </div>
            ),
          },
          {
            key: 'actions',
            header: '',
            className: 'w-44 text-end',
            render: (row) => (
              <div className="flex items-center justify-end gap-1">
                <PortButton
                  variant="secondary"
                  className="h-8 px-2"
                  disabled={busyKey === `restore:${rowKeyOf(row)}` || busyKey === 'bulk-restore'}
                  onClick={() => restoreOne(row)}
                  aria-label={`Restore ${row.display_name}`}
                >
                  <RotateCcw size={14} className="me-1" />
                  Restore
                </PortButton>
                <RowActions
                  items={[
                    {
                      key: 'view',
                      label: 'View snapshot',
                      icon: <Eye size={16} />,
                      onClick: () => setViewing(row),
                    },
                    {
                      key: 'purge',
                      label: 'Delete forever',
                      icon: <Trash2 size={16} />,
                      danger: true,
                      onClick: () => setPurgeTarget(row),
                    },
                  ]}
                />
              </div>
            ),
          },
        ]}
        rows={list.rows as TrashItem[]}
        rowKey={(row) => rowKeyOf(row)}
        loading={loading}
        emptyMessage="Trash is empty. Soft-deleted businesses, users, roles, and catalog items appear here."
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="In trash"
            value={loading ? '—' : stats.total}
            hint={`${stats.types} type${stats.types === 1 ? '' : 's'}`}
            accent="purple"
          />
          <StatCard
            label="Deleted today"
            value={loading ? '—' : stats.todayCount}
            hint="Moved to trash today"
            accent="gold"
          />
          <StatCard
            label="Older than 7 days"
            value={loading ? '—' : stats.olderThan7}
            hint="Consider restore or purge"
            accent="blue"
          />
          <StatCard
            label="Top type"
            value={loading ? '—' : stats.topTypeCount}
            hint={stats.topTypeLabel}
            accent="green"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PortButton variant="ghost" className="h-8 px-2" onClick={togglePage}>
            {pageAllSelected ? 'Clear page' : 'Select page'}
          </PortButton>
          <PortButton
            variant="secondary"
            className="h-8"
            disabled={!selectedRows.length || busyKey === 'bulk-restore'}
            onClick={restoreSelected}
          >
            <RotateCcw size={14} className="me-1" />
            Restore selected ({selectedRows.length})
          </PortButton>
          <PortButton
            variant="danger"
            className="h-8"
            disabled={!selectedRows.length || busyKey === 'bulk-purge'}
            onClick={() => setPurgeTarget(selectedRows)}
          >
            <Trash2 size={14} className="me-1" />
            Purge selected
          </PortButton>
          <span className="ms-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <RefreshCw size={14} />
            Table data refreshes every 15s (no full page reload).
          </span>
          <Link
            href="/logs"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
          >
            <ScrollText size={14} />
            Open Logs
          </Link>
        </div>
      </ListPageShell>

      <FormDialog
        open={Boolean(viewing)}
        title="Trash item snapshot"
        onClose={() => setViewing(null)}
        maxWidth="xl"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <PortButton variant="ghost" onClick={() => setViewing(null)}>
              Close
            </PortButton>
            {viewing ? (
              <>
                <PortButton
                  variant="secondary"
                  onClick={() => {
                    const row = viewing;
                    setViewing(null);
                    restoreOne(row);
                  }}
                >
                  <RotateCcw size={14} className="me-1" />
                  Restore
                </PortButton>
                <PortButton
                  variant="danger"
                  onClick={() => {
                    const row = viewing;
                    setViewing(null);
                    setPurgeTarget(row);
                  }}
                >
                  Delete forever
                </PortButton>
              </>
            ) : null}
          </div>
        }
      >
        {viewing ? (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Name
                </div>
                <div className="mt-1 font-medium">{viewing.display_name}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Type
                </div>
                <div className="mt-1">
                  <StatusChip label={viewing.entity_label} tone="gray" />
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Deleted by
                </div>
                <div className="mt-1 font-medium">
                  {viewing.deleted_by_name || viewing.deleted_by || '—'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  In trash
                </div>
                <div className="mt-1 font-medium">{ageLabel(viewing.deleted_at)}</div>
                <div className="text-xs text-muted-foreground">
                  {viewing.deleted_at
                    ? new Date(viewing.deleted_at).toLocaleString()
                    : '—'}
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Record id
              </div>
              <div className="mt-1 font-mono text-xs">{viewing.entity_id}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Snapshot
              </div>
              <pre className="mt-2 max-h-64 overflow-auto rounded-xl border border-border bg-muted/50 p-3 text-xs leading-relaxed">
                {JSON.stringify(viewing.snapshot ?? { note: 'No snapshot stored' }, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </FormDialog>

      <FormDialog
        open={Boolean(purgeTarget)}
        title="Delete forever?"
        onClose={() => setPurgeTarget(null)}
        maxWidth="md"
        footer={
          <FormDialogFooter
            onCancel={() => setPurgeTarget(null)}
            submitLabel={busyKey === 'bulk-purge' ? 'Deleting…' : 'Delete forever'}
            formId="trash-purge-form"
            submitting={busyKey === 'bulk-purge'}
            disabled={busyKey === 'bulk-purge'}
          />
        }
      >
        {purgeTarget ? (
          <form
            id="trash-purge-form"
            className="space-y-3 text-sm"
            onSubmit={(e) => {
              e.preventDefault();
              const rows = Array.isArray(purgeTarget) ? purgeTarget : [purgeTarget];
              purgeRows(rows);
            }}
          >
            <p className="text-muted-foreground">
              This permanently removes{' '}
              <strong className="text-foreground">
                {Array.isArray(purgeTarget)
                  ? `${purgeTarget.length} selected item${purgeTarget.length === 1 ? '' : 's'}`
                  : `“${purgeTarget.display_name}”`}
              </strong>{' '}
              from the database. This cannot be undone.
            </p>
          </form>
        ) : null}
      </FormDialog>
    </div>
  );
}
