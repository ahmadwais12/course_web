'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import {
  DataTable,
  ErrorBanner,
  InputField,
  PageHeader,
  PortButton,
  PriceText,
  SectionPanel,
  StatCard,
  StatusChip,
} from '@/components/ports';
import { downloadFile } from '@/lib/download';

type Movement = {
  id: string;
  item_name: string;
  transaction_type: 'in' | 'out';
  quantity: number;
  transaction_date: string;
  holder_name: string;
  location: string;
};

type Purchase = {
  id: string;
  reference: string;
  supplier_name: string;
  total_price: number;
  status: string;
  order_date: string;
};

type Transfer = {
  id: string;
  asset_name: string;
  from_holder: string;
  to_holder: string;
  created_at: string;
};

type Grn = {
  id: string;
  grn_number: string;
  item: string;
  quantity_received: number;
  received_date: string;
  status: string;
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

function monthBounds(month: string) {
  const [year, m] = month.split('-').map(Number);
  if (!year || !m) return { from: '', to: '' };
  const last = new Date(year, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

export default function MonthlyReportsPage() {
  const [month, setMonth] = useState(currentMonth);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [grns, setGrns] = useState<Grn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [movementRes, purchaseRes, transferRes, grnRes] = await Promise.all([
        fetch('/api/inventory/transactions'),
        fetch('/api/inventory/purchases'),
        fetch('/api/inventory/transfers'),
        fetch('/api/inventory/ops/grn'),
      ]);
      const movementData = await movementRes.json();
      const purchaseData = await purchaseRes.json();
      const transferData = await transferRes.json();
      const grnData = await grnRes.json();
      if (!movementRes.ok) throw new Error(movementData.error || 'Failed to load monthly data');
      setMovements(Array.isArray(movementData) ? movementData : []);
      setPurchases(Array.isArray(purchaseData) ? purchaseData : []);
      setTransfers(Array.isArray(transferData) ? transferData : []);
      setGrns(Array.isArray(grnData) ? grnData : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load monthly data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const monthRows = useMemo(() => {
    const inMonth = (date: string) => Boolean(date) && date.slice(0, 7) === month;
    const movementRows = movements.filter((row) => inMonth(row.transaction_date));
    return {
      movements: movementRows,
      stockIn: movementRows.filter((row) => row.transaction_type === 'in'),
      stockOut: movementRows.filter((row) => row.transaction_type === 'out'),
      purchases: purchases.filter((row) => inMonth(row.order_date)),
      transfers: transfers.filter((row) => inMonth(row.created_at)),
      grns: grns.filter((row) => inMonth(String(row.received_date ?? ''))),
    };
  }, [movements, purchases, transfers, grns, month]);

  const totals = useMemo(() => {
    const inQty = monthRows.stockIn.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const outQty = monthRows.stockOut.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const purchaseValue = monthRows.purchases.reduce((sum, row) => sum + Number(row.total_price || 0), 0);
    return { inQty, outQty, purchaseValue, net: inQty - outQty };
  }, [monthRows]);

  const bounds = monthBounds(month);
  const exportParams = new URLSearchParams({ from: bounds.from, to: bounds.to });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Monthly Reports"
        description="A month-at-a-glance view of stock movements, purchases, GRNs, and handovers, with downloadable reports."
        pill="MONTHLY"
        pillTone="live"
        actions={
          <div className="w-44">
            <InputField label="Month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
        }
      />

      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Stock in (qty)" value={totals.inQty} accent="green" />
        <StatCard label="Stock out (qty)" value={totals.outQty} accent="gold" />
        <StatCard label="Net change" value={totals.net} accent="blue" />
        <StatCard
          label="Purchase value"
          value={<PriceText value={Math.round(totals.purchaseValue)} />}
          accent="purple"
        />
      </div>

      <SectionPanel
        title="Download the month"
        description={`Reports cover ${bounds.from || '—'} to ${bounds.to || '—'}.`}
      >
        <div className="flex flex-wrap gap-2">
          <PortButton
            variant="primary"
            onClick={() =>
              downloadFile(`/api/inventory/export?type=movements&format=xlsx&${exportParams.toString()}`)
            }
          >
            <Download size={16} /> Movements (Excel)
          </PortButton>
          <PortButton
            onClick={() =>
              downloadFile(`/api/inventory/export?type=handover&format=xlsx&${exportParams.toString()}`)
            }
          >
            <Download size={16} /> Handovers (Excel)
          </PortButton>
          <PortButton onClick={() => downloadFile('/api/inventory/export?type=purchases&format=xlsx')}>
            <Download size={16} /> Purchases (Excel)
          </PortButton>
          <PortButton onClick={() => downloadFile('/api/inventory/export?type=verification&format=xlsx')}>
            <Download size={16} /> Verification (Excel)
          </PortButton>
          <PortButton onClick={() => downloadFile('/api/inventory/export?type=items&format=csv')}>
            <FileText size={16} /> Stock balances (CSV)
          </PortButton>
        </div>
      </SectionPanel>

      <SectionPanel
        title="Month summary"
        description="Counts recorded in the selected month."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Movements" value={monthRows.movements.length} accent="blue" />
          <StatCard label="Purchases" value={monthRows.purchases.length} accent="green" />
          <StatCard label="GRNs" value={monthRows.grns.length} accent="purple" />
          <StatCard label="Handovers" value={monthRows.transfers.length} accent="gold" />
        </div>
      </SectionPanel>

      <SectionPanel title="Stock movements this month" bodyClassName="pt-2">
        <DataTable
          columns={[
            { key: 'transaction_date', header: 'Date' },
            {
              key: 'transaction_type',
              header: 'Type',
              render: (row) => (
                <StatusChip
                  tone={row.transaction_type === 'in' ? 'green' : 'gold'}
                  label={row.transaction_type === 'in' ? 'In' : 'Out'}
                />
              ),
            },
            { key: 'item_name', header: 'Item' },
            { key: 'quantity', header: 'Quantity' },
            { key: 'holder_name', header: 'Holder', render: (row) => row.holder_name || '—' },
            { key: 'location', header: 'Warehouse', render: (row) => row.location || '—' },
          ]}
          rows={monthRows.movements.slice(0, 25)}
          rowKey={(row) => row.id}
          loading={loading}
          emptyMessage="No stock movements recorded in this month."
        />
      </SectionPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionPanel title="Goods received this month" bodyClassName="pt-2">
          <DataTable
            columns={[
              { key: 'grn_number', header: 'GRN' },
              { key: 'item', header: 'Item' },
              { key: 'quantity_received', header: 'Qty' },
              { key: 'received_date', header: 'Date' },
              { key: 'status', header: 'Status', render: (row) => <StatusChip tone="blue" label={row.status || '—'} /> },
            ]}
            rows={monthRows.grns}
            rowKey={(row) => row.id}
            loading={loading}
            emptyMessage="No GRNs recorded in this month."
          />
        </SectionPanel>

        <SectionPanel title="Purchases this month" bodyClassName="pt-2">
          <DataTable
            columns={[
              { key: 'reference', header: 'Reference' },
              { key: 'supplier_name', header: 'Supplier' },
              {
                key: 'total_price',
                header: 'Total',
                align: 'right',
                render: (row) => <PriceText value={(row as unknown as Purchase).total_price} />,
              },
              { key: 'order_date', header: 'Ordered' },
              { key: 'status', header: 'Status', render: (row) => <StatusChip tone="gold" label={row.status || '—'} /> },
            ]}
            rows={monthRows.purchases}
            rowKey={(row) => row.id}
            loading={loading}
            emptyMessage="No purchases recorded in this month."
          />
        </SectionPanel>
      </div>
    </div>
  );
}
