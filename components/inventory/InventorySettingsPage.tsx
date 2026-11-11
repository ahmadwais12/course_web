'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  BarChart3,
  Download,
  FileSpreadsheet,
  Package,
  PackageMinus,
  PackagePlus,
  Ruler,
  Save,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import {
  Dropdown,
  ErrorBanner,
  InputField,
  PageHeader,
  PortButton,
  SectionPanel,
  SegmentedControl,
  Skeleton,
  StatCard,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { downloadCsv, type CsvColumn } from '@/lib/csv';
import {
  TRANSACTION_CSV_COLUMNS,
  nextBinCardNumber,
  type InventoryTransaction,
} from '@/lib/inventory-options';

type Settings = {
  organization_name: string;
  currency: string;
  default_unit_id: string | null;
  default_warehouse: string;
  default_min_quantity: number;
  bin_card_prefix: string;
  require_description: boolean;
  require_holder: boolean;
  low_stock_alerts: boolean;
};

type Unit = { id: string; name: string };
type Warehouse = { id: string; name: string };
type Item = { id: string; bin_card_number: string };
type Transaction = { id: string };

const CURRENCIES = ['AFN', 'USD', 'EUR', 'PKR', 'IRR'];

const QUICK_LINKS = [
  { href: '/inventory/items', label: 'Inventory items', icon: Package },
  { href: '/inventory/transactions', label: 'Transactions', icon: Activity },
  { href: '/inventory/units', label: 'Units', icon: Ruler },
  { href: '/inventory/warehouses', label: 'Warehouses', icon: WarehouseIcon },
  { href: '/inventory/stock-in', label: 'Stock in', icon: PackagePlus },
  { href: '/inventory/stock-out', label: 'Stock out', icon: PackageMinus },
  { href: '/reports/inventory', label: 'Reports', icon: BarChart3 },
];

const ITEM_CSV_COLUMNS: CsvColumn<Record<string, unknown>>[] = [
  { header: 'Bin card number', value: (row) => String(row.bin_card_number ?? '') },
  { header: 'Item name', value: (row) => String(row.item_name ?? '') },
  { header: 'Unit', value: (row) => String(row.unit_label ?? '') },
  { header: 'Quantity', value: (row) => Number(row.quantity ?? 0) },
  { header: 'Minimum quantity', value: (row) => Number(row.min_quantity ?? 0) },
  { header: 'Unit price', value: (row) => Number(row.unit_price ?? 0) },
  { header: 'Total price', value: (row) => Number(row.total_price ?? 0) },
  { header: 'Description', value: (row) => String(row.description ?? '') },
  { header: 'Image', value: (row) => String(row.image_url ?? '') },
];

const stamp = () => new Date().toISOString().slice(0, 10);

export default function InventorySettingsPage() {
  const [form, setForm] = useState<Settings | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [transactionCount, setTransactionCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<'backup' | 'items' | 'transactions' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const responses = await Promise.all([
          fetch('/api/inventory/settings', { cache: 'no-store' }),
          fetch('/api/inventory/items'),
          fetch('/api/inventory/units'),
          fetch('/api/inventory/warehouses'),
          fetch('/api/inventory/transactions'),
        ]);
        const [settingsData, itemData, unitData, whData, txData] = await Promise.all(
          responses.map((res) => res.json().catch(() => null))
        );
        if (!responses[0].ok) throw new Error(settingsData?.error || 'Failed to load settings');
        setForm(settingsData);
        setItems(Array.isArray(itemData) ? itemData : []);
        setUnits(Array.isArray(unitData) ? unitData : []);
        setWarehouses(Array.isArray(whData) ? whData : []);
        setTransactionCount(Array.isArray(txData) ? txData.length : null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load settings');
      }
    })();
  }, []);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  const binCardPreview = useMemo(
    () => (form ? nextBinCardNumber(form.bin_card_prefix, items) : ''),
    [form, items]
  );

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/inventory/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      setForm(data);
      toast.success('Inventory settings saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const downloadBackup = async () => {
    setBusy('backup');
    try {
      const [settingsRes, itemRes, unitRes, whRes, txRes] = await Promise.all([
        fetch('/api/inventory/settings'),
        fetch('/api/inventory/items'),
        fetch('/api/inventory/units'),
        fetch('/api/inventory/warehouses'),
        fetch('/api/inventory/transactions'),
      ]);
      const [settingsData, itemData, unitData, whData, txData] = await Promise.all(
        [settingsRes, itemRes, unitRes, whRes, txRes].map((res) => res.json())
      );
      const payload = {
        exported_at: new Date().toISOString(),
        settings: settingsData,
        units: unitData,
        warehouses: whData,
        items: itemData,
        transactions: txData,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventory-backup-${stamp()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Inventory backup downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Backup failed');
    } finally {
      setBusy(null);
    }
  };

  const downloadItems = () => {
    setBusy('items');
    try {
      if (!items.length) {
        toast.error('There are no items to export yet.');
        return;
      }
      downloadCsv(`inventory-items-${stamp()}`, items as unknown as Record<string, unknown>[], ITEM_CSV_COLUMNS);
    } finally {
      setBusy(null);
    }
  };

  const downloadTransactions = async () => {
    setBusy('transactions');
    try {
      const res = await fetch('/api/inventory/transactions');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load transactions');
      const rows = (Array.isArray(data) ? data : []) as InventoryTransaction[];
      if (!rows.length) {
        toast.error('There are no transactions to export yet.');
        return;
      }
      downloadCsv(`inventory-transactions-${stamp()}`, rows, TRANSACTION_CSV_COLUMNS);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader
        title="Inventory Settings"
        description="Organization details, defaults for new records, stock movement rules, alerts, and data exports — all in one place."
        actions={
          <PortButton variant="primary" onClick={save} disabled={!form || saving}>
            <Save size={16} /> {saving ? 'Saving…' : 'Save changes'}
          </PortButton>
        }
      />

      {error && <ErrorBanner message={error} />}

      {!form ? (
        <SectionPanel title="Loading" description="Fetching your inventory settings.">
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-9 w-1/2" />
          </div>
        </SectionPanel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Items" value={items.length} accent="green" />
            <StatCard label="Units" value={units.length} accent="blue" />
            <StatCard label="Warehouses" value={warehouses.length} accent="purple" />
            <StatCard label="Transactions" value={transactionCount ?? '—'} accent="gold" />
          </div>

          <SectionPanel title="Organization" description="Shown at the top of inventory reports and printed lists.">
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField
                label="Organization name"
                value={form.organization_name}
                onChange={(e) => set('organization_name', e.target.value)}
                placeholder="e.g. Al-Hawa Institute"
                maxLength={120}
              />
              <Dropdown
                label="Currency"
                value={form.currency}
                onChange={(value) => set('currency', value)}
                options={CURRENCIES.map((code) => ({ value: code, label: code }))}
                hint={`Used on item price columns and the reports total.`}
              />
            </div>
          </SectionPanel>

          <SectionPanel
            title="Item defaults"
            description="Preselected values when you create a new inventory item."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Dropdown
                label="Default unit"
                value={form.default_unit_id ?? ''}
                onChange={(value) => set('default_unit_id', value || null)}
                options={units.map((unit) => ({ value: unit.id, label: unit.name }))}
                placeholder="No default"
                clearable
              />
              <InputField
                label="Default minimum quantity"
                type="number"
                min={0}
                value={String(form.default_min_quantity)}
                onChange={(e) => set('default_min_quantity', Math.max(0, Number(e.target.value) || 0))}
                hint="Prefills the minimum quantity on new items."
              />
              <InputField
                label="Bin card prefix"
                value={form.bin_card_prefix}
                onChange={(e) => set('bin_card_prefix', e.target.value)}
                placeholder="e.g. BC"
                maxLength={12}
                hint={
                  form.bin_card_prefix.trim()
                    ? `New items start at ${binCardPreview || '—'}.`
                    : 'Leave empty to type bin card numbers manually.'
                }
              />
            </div>
          </SectionPanel>

          <SectionPanel
            title="Stock movement rules"
            description="The server enforces these on every stock in and stock out saved, including edits."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Dropdown
                label="Default warehouse"
                value={form.default_warehouse}
                onChange={(value) => set('default_warehouse', value)}
                options={warehouses.map((warehouse) => ({ value: warehouse.name, label: warehouse.name }))}
                placeholder="No default"
                clearable
              />
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Description required</p>
                    <p className="text-xs text-muted-foreground">Stock movements must include a description.</p>
                  </div>
                  <SegmentedControl
                    value={form.require_description ? 'on' : 'off'}
                    onChange={(value) => set('require_description', value === 'on')}
                    options={[
                      { value: 'on', label: 'On' },
                      { value: 'off', label: 'Off' },
                    ]}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Holder required for stock out</p>
                    <p className="text-xs text-muted-foreground">Issues must name the person or office receiving stock.</p>
                  </div>
                  <SegmentedControl
                    value={form.require_holder ? 'on' : 'off'}
                    onChange={(value) => set('require_holder', value === 'on')}
                    options={[
                      { value: 'on', label: 'On' },
                      { value: 'off', label: 'Off' },
                    ]}
                  />
                </div>
              </div>
            </div>
          </SectionPanel>

          <SectionPanel
            title="Alerts"
            description="When on, items at or below their minimum quantity show a low-stock chip in the item list."
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">Low stock alerts</p>
              <SegmentedControl
                value={form.low_stock_alerts ? 'on' : 'off'}
                onChange={(value) => set('low_stock_alerts', value === 'on')}
                options={[
                  { value: 'on', label: 'On' },
                  { value: 'off', label: 'Off' },
                ]}
              />
            </div>
          </SectionPanel>

          <SectionPanel title="Quick links" description="Jump to the pages these settings affect.">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted"
                >
                  <link.icon size={16} className="text-muted-foreground" />
                  {link.label}
                </Link>
              ))}
            </div>
          </SectionPanel>

          <SectionPanel
            title="Data"
            description="Download a full JSON backup or spreadsheet exports of the current inventory data."
          >
            <div className="flex flex-wrap gap-2">
              <PortButton onClick={downloadBackup} disabled={busy !== null}>
                <Download size={16} /> {busy === 'backup' ? 'Preparing…' : 'Backup (JSON)'}
              </PortButton>
              <PortButton onClick={downloadItems} disabled={busy !== null}>
                <FileSpreadsheet size={16} /> Items CSV
              </PortButton>
              <PortButton onClick={downloadTransactions} disabled={busy !== null}>
                <FileSpreadsheet size={16} /> Transactions CSV
              </PortButton>
            </div>
          </SectionPanel>
        </>
      )}
    </div>
  );
}
