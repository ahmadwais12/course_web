'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import {
  ErrorBanner,
  ListPageShell,
  PortButton,
  StatusChip,
  statusToneFromValue,
} from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';
import { downloadCsv } from '@/lib/csv';
import { timestampLabel } from '@/lib/display';

type ChangeRow = {
  id: string;
  entity: string;
  action: string;
  name: string;
  detail: string;
  changed_at: string;
};

const titleCase = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export default function ChangeHistoryPage({
  entity,
  title,
  description,
}: {
  entity: 'asset' | 'project' | 'holder' | 'settings';
  title: string;
  description: string;
}) {
  const [rows, setRows] = useState<ChangeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/history?entity=${entity}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load change history');
      setRows(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load change history');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [entity]);

  useEffect(() => {
    load();
  }, [load]);

  const list = useListQuery({
    items: rows as (ChangeRow & Record<string, unknown>)[],
    searchKeys: ['name', 'detail', 'action'],
    filterKey: entity,
  });

  const exportCsv = () => {
    downloadCsv(
      `${entity}-history-${new Date().toISOString().slice(0, 10)}`,
      list.filtered as ChangeRow[],
      [
        { header: 'Timestamp', value: (row) => timestampLabel(row.changed_at) },
        { header: 'Action', value: (row) => titleCase(row.action) },
        { header: 'Name', value: (row) => row.name },
        { header: 'Detail', value: (row) => row.detail },
      ]
    );
  };

  return (
    <>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <ListPageShell
        title={title}
        description={description}
        secondaryActions={
          <PortButton onClick={exportCsv} disabled={loading || list.total === 0}>
            <Download size={16} /> CSV
          </PortButton>
        }
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search name, action, or detail…"
        onResetFilters={() => list.reset()}
        columns={[
          {
            key: 'changed_at',
            header: 'Changed at',
            render: (row) => timestampLabel(row.changed_at),
          },
          {
            key: 'action',
            header: 'Action',
            render: (row) => (
              <StatusChip tone={statusToneFromValue(row.action)} label={titleCase(row.action)} />
            ),
          },
          { key: 'name', header: 'Record' },
          { key: 'detail', header: 'Detail', render: (row) => row.detail || '—' },
        ]}
        rows={list.rows}
        rowKey={(row) => String(row.id)}
        loading={loading}
        emptyMessage="No changes recorded yet. Create or edit a record to start the history."
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
      />
    </>
  );
}
