'use client';

import React, { useEffect, useState } from 'react';
import { DataTable, ErrorBanner, PageHeader, SectionPanel, StatCard } from '@/components/ports';

type Report = {
  headlines: {
    inventory_items: number;
    total_on_hand: number;
    items_at_or_below_minimum: number;
    movements_last_30_days: number;
  };
  stock_health: { comfortable: number; at_minimum: number; below_minimum: number };
  monthly_movements: { month: string; in: number; out: number }[];
  unit_mix: { unit: string; count: number }[];
  low_items: { id: string; item_name: string; quantity: number; min_quantity: number; unit_label: string }[];
};

export default function InventoryReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [settings, setSettings] = useState<{ organization_name: string; currency: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [reportRes, settingsRes] = await Promise.all([
          fetch('/api/inventory/reports'),
          fetch('/api/inventory/settings'),
        ]);
        const data = await reportRes.json();
        const settingsData = await settingsRes.json().catch(() => null);
        if (!reportRes.ok) throw new Error(data.error || 'Failed to load report');
        setReport(data);
        setSettings(settingsRes.ok && settingsData ? settingsData : null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const h = report?.headlines;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventory Reports"
        description={
          settings?.organization_name
            ? `${settings.organization_name} — on-hand totals, stock against minimum, and in versus out counts for the last six months.`
            : 'On-hand totals, stock against minimum, and in versus out counts for the last six months.'
        }
        pill={loading ? 'LOADING…' : 'LIVE DATA'}
        pillTone={loading ? 'neutral' : 'live'}
      />
      {error && <ErrorBanner message={error} />}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Inventory items" value={h?.inventory_items ?? '—'} accent="green" />
        <StatCard
          label={`Total on hand${settings?.currency ? ` (${settings.currency})` : ''}`}
          value={h?.total_on_hand ?? '—'}
          accent="blue"
        />
        <StatCard label="At or below minimum" value={h?.items_at_or_below_minimum ?? '—'} accent="gold" />
        <StatCard label="Movements (30 days)" value={h?.movements_last_30_days ?? '—'} accent="purple" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionPanel title="Stock levels" description="Comfortable is above minimum. At minimum is equal. Below minimum is under it.">
          <ul className="space-y-2 text-sm">
            <li>Comfortable: {report?.stock_health.comfortable ?? '—'}</li>
            <li>At minimum: {report?.stock_health.at_minimum ?? '—'}</li>
            <li>Below minimum: {report?.stock_health.below_minimum ?? '—'}</li>
          </ul>
        </SectionPanel>
        <SectionPanel title="Unit mix" description="How many item records use each unit.">
          <ul className="space-y-2 text-sm">
            {(report?.unit_mix ?? []).map((row) => (
              <li key={row.unit}>
                {row.unit}: {row.count}
              </li>
            ))}
            {!loading && (report?.unit_mix.length ?? 0) === 0 && (
              <li className="text-muted-foreground">No items yet.</li>
            )}
          </ul>
        </SectionPanel>
      </div>
      <SectionPanel title="Movement trend" description="In and out transaction counts by month, last six months.">
        <DataTable
          columns={[
            { key: 'month', header: 'Month' },
            { key: 'in', header: 'In' },
            { key: 'out', header: 'Out' },
          ]}
          rows={report?.monthly_movements ?? []}
          rowKey={(row) => row.month}
          loading={loading}
          emptyMessage="Not enough data to chart yet."
        />
      </SectionPanel>
      <SectionPanel title="At or below minimum" description="Items whose on-hand quantity is less than or equal to the minimum.">
        <DataTable
          columns={[
            { key: 'item_name', header: 'Item' },
            { key: 'unit_label', header: 'Unit', render: (row) => row.unit_label || '—' },
            { key: 'quantity', header: 'On hand' },
            { key: 'min_quantity', header: 'Minimum' },
          ]}
          rows={report?.low_items ?? []}
          rowKey={(row) => row.id}
          loading={loading}
          emptyMessage="Every item is above its minimum."
        />
      </SectionPanel>
    </div>
  );
}
