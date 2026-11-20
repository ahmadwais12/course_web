'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import {
  DataTable,
  ErrorBanner,
  ListPageShell,
  PortButton,
  SectionPanel,
  StatCard,
  StatusChip,
} from '@/components/ports';
import { timestampLabel } from '@/lib/display';
import { downloadFile } from '@/lib/download';
import { useListQuery } from '@/hooks/useListQuery';

type Transfer = {
  id: string;
  asset_id: string;
  asset_name: string;
  from_holder: string;
  to_holder: string;
  from_department: string;
  to_department: string;
  from_location: string;
  to_location: string;
  from_province: string;
  to_province: string;
  note: string;
  created_at: string;
};

type Asset = {
  id: string;
  tag_number: string;
  asset_name: string;
  status: string;
  holder_name: string;
  department: string;
  location: string;
  province: string;
  quantity: number;
};

const day = (value: string) => value.slice(0, 10);

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 89);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function HandoverReportPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState(defaultRange);
  const [deptFilter, setDeptFilter] = useState('');
  const [custodyPage, setCustodyPage] = useState(1);
  const [custodyPerPage, setCustodyPerPage] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [transferRes, assetRes] = await Promise.all([
        fetch('/api/inventory/transfers'),
        fetch('/api/inventory/assets'),
      ]);
      const transferData = await transferRes.json();
      const assetData = await assetRes.json();
      if (!transferRes.ok) throw new Error(transferData.error || 'Failed to load handovers');
      setTransfers(Array.isArray(transferData) ? transferData : []);
      setAssets(Array.isArray(assetData) ? assetData : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load handovers');
      setTransfers([]);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const inRange = useMemo(
    () =>
      transfers.filter((row) => {
        const date = day(row.created_at);
        if (range.from && date < range.from) return false;
        if (range.to && date > range.to) return false;
        return true;
      }),
    [transfers, range]
  );

  const filterFn = useCallback(
    (row: Transfer) => {
      if (deptFilter && row.to_department !== deptFilter) return false;
      return true;
    },
    [deptFilter]
  );

  const list = useListQuery({
    items: inRange as (Transfer & Record<string, unknown>)[],
    searchKeys: ['asset_name', 'from_holder', 'to_holder', 'from_department', 'to_department', 'note'],
    filterKey: `${range.from}|${range.to}|${deptFilter}`,
    filterFn: filterFn as (row: Transfer & Record<string, unknown>) => boolean,
  });

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const row of transfers) {
      if (row.to_department) set.add(row.to_department);
      if (row.from_department) set.add(row.from_department);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [transfers]);

  const assigned = assets.filter((row) => Boolean(row.holder_name)).length;
  const custodyRows = useMemo(
    () => assets.slice((custodyPage - 1) * custodyPerPage, custodyPage * custodyPerPage),
    [assets, custodyPage, custodyPerPage]
  );

  const exportReport = (format: 'xlsx' | 'csv') => {
    const params = new URLSearchParams({ type: 'handover', format });
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    downloadFile(`/api/inventory/export?${params.toString()}`);
  };

  return (
    <ListPageShell
      title="Handover Report"
      description="Asset handover history for the selected window, plus who currently holds every asset."
      pill="HANDOVERS"
      loading={loading}
      secondaryActions={
        <>
          <PortButton variant="primary" onClick={() => exportReport('xlsx')}>
            <Download size={16} /> Excel
          </PortButton>
          <PortButton onClick={() => exportReport('csv')}>
            <FileText size={16} /> CSV
          </PortButton>
        </>
      }
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search asset, holder, department, or note…"
      dateFrom={range.from}
      dateTo={range.to}
      onDateRangeChange={(next) => setRange({ from: next.from, to: next.to })}
      filters={[
        {
          key: 'department',
          label: 'Received by department',
          value: deptFilter,
          onChange: setDeptFilter,
          options: departments.map((value) => ({ value, label: value })),
        },
      ]}
      onResetFilters={() => {
        setDeptFilter('');
        list.reset();
      }}
      columns={[
        {
          key: 'created_at',
          header: 'Created at',
          render: (row) => timestampLabel(row.created_at),
        },
        { key: 'asset_name', header: 'Asset' },
        {
          key: 'from_holder',
          header: 'From',
          render: (row) => (
            <div>
              <div>{row.from_holder || '—'}</div>
              <div className="text-xs text-muted-foreground">
                {[row.from_department, row.from_location].filter(Boolean).join(' · ') || '—'}
              </div>
            </div>
          ),
        },
        {
          key: 'to_holder',
          header: 'To',
          render: (row) => (
            <div>
              <div>{row.to_holder || '—'}</div>
              <div className="text-xs text-muted-foreground">
                {[row.to_department, row.to_location].filter(Boolean).join(' · ') || '—'}
              </div>
            </div>
          ),
        },
        { key: 'from_province', header: 'From province', render: (row) => row.from_province || '—' },
        { key: 'to_province', header: 'To province', render: (row) => row.to_province || '—' },
        { key: 'note', header: 'Note', render: (row) => row.note || '—' },
      ]}
      rows={list.rows}
      rowKey={(row) => String(row.id)}
      emptyMessage="No handovers recorded in this date range."
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
    >
      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Handovers in range" value={list.total} accent="blue" />
        <StatCard label="Total handovers" value={transfers.length} accent="purple" />
        <StatCard label="Assets" value={assets.length} accent="green" />
        <StatCard label="Assigned assets" value={assigned} accent="gold" />
      </div>

      <SectionPanel
        title="Current custody"
        description="The holder, department, and location recorded on each asset right now."
        bodyClassName="pt-2"
      >
        <DataTable
          columns={[
            { key: 'tag_number', header: 'Tag', render: (row) => row.tag_number || '—' },
            { key: 'asset_name', header: 'Asset' },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <StatusChip tone="blue" label={row.status || 'unknown'} />,
            },
            {
              key: 'holder_name',
              header: 'Holder',
              render: (row) =>
                row.holder_name || <StatusChip tone="gray" label="Unassigned" />,
            },
            { key: 'department', header: 'Department', render: (row) => row.department || '—' },
            { key: 'location', header: 'Location', render: (row) => row.location || '—' },
            { key: 'province', header: 'Province', render: (row) => row.province || '—' },
          ]}
          rows={custodyRows}
          rowKey={(row) => row.id}
          loading={loading}
          emptyMessage="No assets registered yet."
          page={custodyPage}
          perPage={custodyPerPage}
          total={assets.length}
          onPageChange={setCustodyPage}
          onPerPageChange={(next) => {
            setCustodyPerPage(next);
            setCustodyPage(1);
          }}
        />
      </SectionPanel>
    </ListPageShell>
  );
}
