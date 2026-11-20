'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import {
  ErrorBanner,
  ListPageShell,
  PortButton,
  PriceText,
  StatCard,
  StatusChip,
} from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';
import { downloadCsv } from '@/lib/csv';
import { downloadFile } from '@/lib/download';

type Asset = {
  id: string;
  tag_number: string;
  asset_name: string;
  status: string;
  quantity: number;
  cost: number | null;
  asset_currency: string;
  useful_life_years: number | null;
  salvage_value: number | null;
  depreciation_method: string;
  invoice_date: string;
  depreciable: boolean;
  annual_depreciation: number;
  accumulated_depreciation: number;
  book_value: number;
  fully_depreciated: boolean;
};

export default function DepreciationPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scopeFilter, setScopeFilter] = useState('depreciable');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/assets');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load assets');
      setAssets(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load assets');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filterFn = useCallback(
    (row: Asset) => {
      if (scopeFilter === 'depreciable') return row.depreciable;
      if (scopeFilter === 'fully') return row.fully_depreciated;
      if (scopeFilter === 'active') return row.depreciable && !row.fully_depreciated;
      return true;
    },
    [scopeFilter]
  );

  const list = useListQuery({
    items: assets as (Asset & Record<string, unknown>)[],
    searchKeys: ['asset_name', 'tag_number', 'status'],
    filterKey: scopeFilter,
    filterFn: filterFn as (row: Asset & Record<string, unknown>) => boolean,
  });

  const totals = useMemo(() => {
    const rows = list.filtered as Asset[];
    return {
      cost: rows.reduce((sum, row) => sum + (row.cost ?? 0) * Math.max(1, row.quantity || 1), 0),
      annual: rows.reduce((sum, row) => sum + Number(row.annual_depreciation || 0), 0),
      book: rows.reduce((sum, row) => sum + Number(row.book_value || 0), 0),
    };
  }, [list.filtered]);

  const exportCsv = () => {
    downloadCsv(
      `depreciation-${new Date().toISOString().slice(0, 10)}`,
      list.filtered as Asset[],
      [
        { header: 'Tag', value: (row) => row.tag_number },
        { header: 'Asset', value: (row) => row.asset_name },
        { header: 'Quantity', value: (row) => row.quantity },
        { header: 'Cost', value: (row) => row.cost },
        { header: 'Useful life (years)', value: (row) => row.useful_life_years },
        { header: 'Salvage value', value: (row) => row.salvage_value },
        { header: 'Method', value: (row) => row.depreciation_method },
        { header: 'Annual depreciation', value: (row) => row.annual_depreciation },
        { header: 'Accumulated', value: (row) => row.accumulated_depreciation },
        { header: 'Book value', value: (row) => row.book_value },
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
        title="Depreciation"
        description="Current depreciation position for assets with a useful life and purchase date."
        loading={loading}
        secondaryActions={
          <>
            <PortButton
              variant="primary"
              onClick={() => downloadFile('/api/inventory/export?type=assets&format=xlsx')}
            >
              <Download size={16} /> Excel
            </PortButton>
            <PortButton onClick={exportCsv}>
              <FileText size={16} /> CSV
            </PortButton>
          </>
        }
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search asset, tag, or status…"
        filters={[
          {
            key: 'scope',
            label: 'Scope',
            value: scopeFilter,
            onChange: setScopeFilter,
            options: [
              { value: 'depreciable', label: 'All depreciable' },
              { value: 'active', label: 'Still depreciating' },
              { value: 'fully', label: 'Fully depreciated' },
              { value: 'all', label: 'Every asset' },
            ],
          },
        ]}
        onResetFilters={() => {
          setScopeFilter('depreciable');
          list.reset();
        }}
        columns={[
          {
            key: 'asset_name',
            header: 'Asset',
            render: (row) => (
              <div>
                <div className="font-medium">{row.asset_name}</div>
                <div className="text-xs text-muted-foreground">{row.tag_number || '—'}</div>
              </div>
            ),
          },
          { key: 'cost', header: 'Cost', align: 'right', render: (row) => <PriceText value={row.cost} /> },
          { key: 'useful_life_years', header: 'Life (yrs)', render: (row) => row.useful_life_years ?? '—' },
          {
            key: 'annual_depreciation',
            header: 'Annual',
            align: 'right',
            render: (row) => (row.depreciable ? <PriceText value={Math.round(row.annual_depreciation)} /> : '—'),
          },
          {
            key: 'accumulated_depreciation',
            header: 'Accumulated',
            align: 'right',
            render: (row) => (row.depreciable ? <PriceText value={Math.round(row.accumulated_depreciation)} /> : '—'),
          },
          {
            key: 'book_value',
            header: 'Book value',
            align: 'right',
            render: (row) => <PriceText value={Math.round(row.book_value)} />,
          },
          {
            key: 'fully_depreciated',
            header: 'State',
            render: (row) =>
              !row.depreciable ? (
                <StatusChip tone="gray" label="Not depreciable" />
              ) : row.fully_depreciated ? (
                <StatusChip tone="purple" label="Fully depreciated" />
              ) : (
                <StatusChip tone="green" label="Depreciating" />
              ),
          },
        ]}
        rows={list.rows}
        rowKey={(row) => String(row.id)}
        emptyMessage="No assets match this depreciation scope."
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Assets in view" value={list.total} accent="blue" />
          <StatCard label="Total cost" value={Math.round(totals.cost)} accent="green" />
          <StatCard label="Annual depreciation" value={Math.round(totals.annual)} accent="gold" />
          <StatCard label="Book value" value={Math.round(totals.book)} accent="purple" />
        </div>
      </ListPageShell>
    </>
  );
}
