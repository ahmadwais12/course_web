'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import {
  DataTable,
  ErrorBanner,
  ListPageShell,
  PortButton,
  PriceText,
  SectionPanel,
  StatCard,
  StatusChip,
} from '@/components/ports';
import { downloadFile } from '@/lib/download';
import { useListQuery } from '@/hooks/useListQuery';

type StockRow = {
  id: string;
  bin_card_number: string;
  item_name: string;
  unit_label: string;
  quantity: number;
  min_quantity: number;
  qty_level: 'below' | 'at' | 'comfortable';
  last_count_date: string | null;
  last_variance: number | null;
  last_note: string;
};

type AssetRow = {
  id: string;
  tag_number: string;
  asset_name: string;
  status: string;
  holder_name: string;
  department: string;
  location: string;
  province: string;
  quantity: number;
  book_value: number | null;
};

type Summary = {
  items: number;
  below: number;
  atMinimum: number;
  neverCounted: number;
  assets: number;
  unassignedAssets: number;
};

type Payload = { stock: StockRow[]; assets: AssetRow[]; summary: Summary };

const LEVEL_LABEL: Record<StockRow['qty_level'], string> = {
  below: 'Below min',
  at: 'At min',
  comfortable: 'Above min',
};

const LEVEL_TONE: Record<StockRow['qty_level'], 'gold' | 'blue' | 'green'> = {
  below: 'gold',
  at: 'blue',
  comfortable: 'green',
};

export default function VerificationReportPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState('');
  const [countFilter, setCountFilter] = useState('');
  const [custodyPage, setCustodyPage] = useState(1);
  const [custodyPerPage, setCustodyPerPage] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/verification');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load verification data');
      setData({
        stock: Array.isArray(body.stock) ? body.stock : [],
        assets: Array.isArray(body.assets) ? body.assets : [],
        summary: body.summary,
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load verification data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filterFn = useCallback(
    (row: StockRow) => {
      if (levelFilter && row.qty_level !== levelFilter) return false;
      if (countFilter === 'counted' && !row.last_count_date) return false;
      if (countFilter === 'never' && row.last_count_date) return false;
      return true;
    },
    [levelFilter, countFilter]
  );

  const list = useListQuery({
    items: (data?.stock ?? []) as (StockRow & Record<string, unknown>)[],
    searchKeys: ['item_name', 'bin_card_number', 'last_note', 'unit_label'],
    filterKey: `${levelFilter}|${countFilter}`,
    filterFn: filterFn as (row: StockRow & Record<string, unknown>) => boolean,
  });

  const assets = data?.assets ?? [];
  const custodyRows = useMemo(
    () => assets.slice((custodyPage - 1) * custodyPerPage, custodyPage * custodyPerPage),
    [assets, custodyPage, custodyPerPage]
  );

  const exportReport = (format: 'xlsx' | 'csv') => {
    downloadFile(`/api/inventory/export?type=verification&format=${format}`);
  };

  const summary = data?.summary;

  return (
    <ListPageShell
      title="Verification Report"
      description="Physical count status for every stock item alongside the fixed-asset custody register."
      pill="VERIFICATION"
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
      searchPlaceholder="Search item, bin card, or count note…"
      filters={[
        {
          key: 'level',
          label: 'Quantity level',
          value: levelFilter,
          onChange: setLevelFilter,
          options: [
            { value: 'below', label: 'Below minimum' },
            { value: 'at', label: 'At minimum' },
            { value: 'comfortable', label: 'Above minimum' },
          ],
        },
        {
          key: 'count',
          label: 'Count status',
          value: countFilter,
          onChange: setCountFilter,
          options: [
            { value: 'counted', label: 'Counted at least once' },
            { value: 'never', label: 'Never counted' },
          ],
        },
      ]}
      onResetFilters={() => {
        setLevelFilter('');
        setCountFilter('');
        list.reset();
      }}
      columns={[
        {
          key: 'item_name',
          header: 'Item',
          render: (row) => (
            <div>
              <div className="font-medium">{row.item_name}</div>
              <div className="text-xs text-muted-foreground">{row.bin_card_number || '—'}</div>
            </div>
          ),
        },
        { key: 'unit_label', header: 'Unit', render: (row) => row.unit_label || '—' },
        { key: 'quantity', header: 'On hand' },
        { key: 'min_quantity', header: 'Minimum' },
        {
          key: 'qty_level',
          header: 'Level',
          render: (row) => <StatusChip tone={LEVEL_TONE[row.qty_level]} label={LEVEL_LABEL[row.qty_level]} />,
        },
        {
          key: 'last_count_date',
          header: 'Last count',
          render: (row) => row.last_count_date || <StatusChip tone="gray" label="Never" />,
        },
        {
          key: 'last_variance',
          header: 'Variance',
          render: (row) =>
            row.last_variance === null || row.last_variance === undefined ? (
              '—'
            ) : (
              <span className={row.last_variance === 0 ? '' : 'font-semibold'}>
                {row.last_variance > 0 ? `+${row.last_variance}` : row.last_variance}
              </span>
            ),
        },
        { key: 'last_note', header: 'Count note', render: (row) => row.last_note || '—' },
      ]}
      rows={list.rows}
      rowKey={(row) => String(row.id)}
      emptyMessage="No stock items match this verification filter."
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
    >
      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Stock items" value={summary?.items ?? '—'} accent="blue" />
        <StatCard label="Below minimum" value={summary?.below ?? '—'} accent="gold" />
        <StatCard label="Never counted" value={summary?.neverCounted ?? '—'} accent="purple" />
        <StatCard label="Unassigned assets" value={summary?.unassignedAssets ?? '—'} accent="green" />
      </div>

      <SectionPanel
        title="Asset verification register"
        description={`${assets.length} asset(s) with custody details for physical verification.`}
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
            { key: 'holder_name', header: 'Holder', render: (row) => row.holder_name || 'Unassigned' },
            { key: 'department', header: 'Department', render: (row) => row.department || '—' },
            { key: 'location', header: 'Location', render: (row) => row.location || '—' },
            { key: 'province', header: 'Province', render: (row) => row.province || '—' },
            { key: 'quantity', header: 'Qty' },
            {
              key: 'book_value',
              header: 'Book value',
              align: 'right',
              render: (row) =>
                row.book_value === null || row.book_value === undefined ? (
                  '—'
                ) : (
                  <PriceText value={row.book_value} />
                ),
            },
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
