'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Download, HardDrive } from 'lucide-react';
import {
  ErrorBanner,
  ListPageShell,
  PortButton,
  RowActions,
  SectionPanel,
  StatCard,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { timestampLabel } from '@/lib/display';
import { downloadFile } from '@/lib/download';

type Backup = { name: string; size: number; created_at: string };

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function BackupsPage() {
  const [rows, setRows] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/backups');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load backups');
      setRows(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load backups');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/inventory/backups', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backup failed');
      toast.success(`Backup created with ${data.files ?? 0} file(s)`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Backup failed');
    } finally {
      setCreating(false);
    }
  };

  const list = useListQuery({
    items: rows as (Backup & Record<string, unknown>)[],
    searchKeys: ['name'],
    filterKey: '',
  });

  const totalSize = rows.reduce((sum, row) => sum + row.size, 0);

  return (
    <>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <ListPageShell
        title="Backups"
        description="Downloadable ZIP snapshots of the inventory, asset, operations, and change-log data files."
        primaryAction={{ label: creating ? 'Creating…' : 'Create backup', onClick: create }}
        secondaryActions={
          <PortButton onClick={load} disabled={loading}>
            Refresh
          </PortButton>
        }
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search backups by file name…"
        onResetFilters={() => list.reset()}
        columns={[
          { key: 'name', header: 'Backup file' },
          { key: 'size', header: 'Size', align: 'right', render: (row) => formatSize(row.size) },
          {
            key: 'created_at',
            header: 'Created at',
            render: (row) => timestampLabel(row.created_at),
          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) => (
              <div className="flex justify-end">
                <RowActions
                  items={[
                    {
                      key: 'download',
                      label: 'Download',
                      icon: <Download size={16} />,
                      onClick: () => downloadFile(`/api/inventory/backups/${encodeURIComponent(row.name)}`),
                    },
                  ]}
                />
              </div>
            ),
          },
        ]}
        rows={list.rows}
        rowKey={(row) => String(row.name)}
        loading={loading}
        emptyMessage="No backups yet. Create the first snapshot."
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard label="Backups" value={rows.length} accent="blue" />
          <StatCard label="Total size" value={formatSize(totalSize)} accent="green" />
          <StatCard label="Latest" value={rows[0] ? timestampLabel(rows[0].created_at) : '—'} accent="purple" />
        </div>

        <SectionPanel
          title="What is included"
          description="A backup ZIP contains the current JSON stores. Download it before large imports or deletions."
        >
          <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
            <li>
              <HardDrive size={14} className="inline" /> inventory.json, assets.json, operations.json, and
              change-log.json when present.
            </li>
            <li>Backups are read-only snapshots; restoring one is a manual file replacement.</li>
            <li>Keep copies off the server for disaster recovery.</li>
          </ul>
        </SectionPanel>
      </ListPageShell>
    </>
  );
}
