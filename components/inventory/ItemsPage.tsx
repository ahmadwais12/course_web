'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Copy, Download, Eye } from 'lucide-react';
import {
  ConfirmDialog,
  DetailDialog,
  Dropdown,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  PortButton,
  RowActions,
  StatusChip,
  TextAreaField,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { downloadCsv } from '@/lib/csv';
import { TRANSACTION_CSV_COLUMNS, type InventoryTransaction } from '@/lib/inventory-options';

type Unit = { id: string; name: string };
type Item = {
  id: string;
  bin_card_number: string;
  item_name: string;
  unit_id: string | null;
  unit_label: string;
  quantity: number;
  min_quantity: number;
  unit_price: number;
  total_price: number;
  description: string;
  qty_level: 'below' | 'at' | 'comfortable';
};

const empty = {
  bin_card_number: '',
  item_name: '',
  unit_id: '',
  quantity: '0',
  min_quantity: '0',
  unit_price: '0',
  description: '',
};

export default function ItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unitFilter, setUnitFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Item | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Item | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemRes, unitRes] = await Promise.all([fetch('/api/inventory/items'), fetch('/api/inventory/units')]);
      const itemData = await itemRes.json();
      const unitData = await unitRes.json();
      if (!itemRes.ok) throw new Error(itemData.error || 'Failed to load items');
      setItems(Array.isArray(itemData) ? itemData : []);
      setUnits(Array.isArray(unitData) ? unitData : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load items');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filterFn = useCallback(
    (item: Item) => {
      if (unitFilter && item.unit_id !== unitFilter) return false;
      if (levelFilter === 'low' && item.quantity > item.min_quantity) return false;
      if (levelFilter === 'high' && item.quantity <= item.min_quantity) return false;
      return true;
    },
    [unitFilter, levelFilter]
  );

  const list = useListQuery({
    items: items as (Item & Record<string, unknown>)[],
    searchKeys: ['item_name', 'bin_card_number', 'description', 'unit_label'],
    filterKey: `${unitFilter}|${levelFilter}`,
    filterFn: filterFn as (item: Item & Record<string, unknown>) => boolean,
  });

  const totalPrice = useMemo(() => {
    const qty = Number(form.quantity) || 0;
    const price = Number(form.unit_price) || 0;
    return Math.round(qty * price * 100) / 100;
  }, [form.quantity, form.unit_price]);

  const startCreate = () => {
    setEditing(null);
    setForm(empty);
    setFormError(null);
    setOpen(true);
  };

  const startEdit = (item: Item) => {
    setEditing(item);
    setForm({
      bin_card_number: item.bin_card_number,
      item_name: item.item_name,
      unit_id: item.unit_id ?? '',
      quantity: String(item.quantity),
      min_quantity: String(item.min_quantity),
      unit_price: String(item.unit_price),
      description: item.description,
    });
    setFormError(null);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(editing ? `/api/inventory/items/${editing.id}` : '/api/inventory/items', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          unit_id: form.unit_id || null,
          quantity: Number(form.quantity) || 0,
          min_quantity: Number(form.min_quantity) || 0,
          unit_price: Number(form.unit_price) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success(editing ? 'Item updated' : 'Item created');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: Item) => {
    const res = await fetch(`/api/inventory/items/${item.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || 'Delete failed');
      return;
    }
    toast.success('Item deleted');
    await load();
  };

  const copyBin = async (item: Item) => {
    if (!item.bin_card_number) return;
    await navigator.clipboard.writeText(item.bin_card_number);
    toast.success('Bin card copied');
  };

  const stamp = () => new Date().toISOString().slice(0, 10);

  const exportItems = () => {
    downloadCsv(`inventory-items-${stamp()}`, list.filtered as Item[], [
      { header: 'Bin card number', value: (row) => row.bin_card_number },
      { header: 'Item name', value: (row) => row.item_name },
      { header: 'Unit', value: (row) => row.unit_label },
      { header: 'Quantity', value: (row) => row.quantity },
      { header: 'Minimum quantity', value: (row) => row.min_quantity },
      { header: 'Unit price', value: (row) => row.unit_price },
      { header: 'Total price', value: (row) => row.total_price },
      { header: 'Description', value: (row) => row.description },
    ]);
  };

  const exportTransactions = async () => {
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
    }
  };

  return (
    <>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <ListPageShell
        title="Inventory Items"
        description="Create and manage inventory items. Total price is quantity times unit price."
        primaryAction={{ label: 'New item', onClick: startCreate }}
        secondaryActions={
          <>
            <PortButton onClick={exportItems} disabled={loading || list.total === 0}>
              <Download size={16} /> Items report
            </PortButton>
            <PortButton onClick={exportTransactions} disabled={loading}>
              <Download size={16} /> Transactions report
            </PortButton>
          </>
        }
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search name, bin card, or description…"
        filters={[
          {
            key: 'unit',
            label: 'Unit',
            value: unitFilter,
            onChange: setUnitFilter,
            options: units.map((unit) => ({ value: unit.id, label: unit.name })),
          },
          {
            key: 'level',
            label: 'Quantity level',
            value: levelFilter,
            onChange: setLevelFilter,
            options: [
              { value: 'low', label: 'Low (at or below minimum)' },
              { value: 'high', label: 'High (above minimum)' },
            ],
          },
        ]}
        onResetFilters={() => {
          setUnitFilter('');
          setLevelFilter('');
          list.reset();
        }}
        columns={[
          {
            key: 'item_name',
            header: 'Item',
            render: (row) => (
              <div>
                <div className="font-medium">{row.item_name}</div>
                <button type="button" className="text-xs text-muted-foreground" onClick={() => copyBin(row as Item)}>
                  {row.bin_card_number || '—'}
                </button>
              </div>
            ),
          },
          { key: 'unit_label', header: 'Unit', render: (row) => row.unit_label || '—' },
          {
            key: 'quantity',
            header: 'Quantity',
            render: (row) => (
              <span className="inline-flex items-center gap-2">
                {row.quantity}
                {row.qty_level !== 'comfortable' && (
                  <StatusChip tone="gold" label={row.qty_level === 'below' ? 'Below min' : 'At min'} />
                )}
              </span>
            ),
          },
          { key: 'min_quantity', header: 'Minimum' },
          { key: 'total_price', header: 'Total price' },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) => (
              <div className="flex justify-end">
                <RowActions
                  maxInline={5}
                  items={[
                    {
                      key: 'copy',
                      label: 'Copy bin card',
                      icon: <Copy size={16} />,
                      onClick: () => copyBin(row as Item),
                    },
                    {
                      key: 'view',
                      label: 'Details',
                      icon: <Eye size={16} />,
                      onClick: () => setViewing(row as Item),
                    },
                    {
                      key: 'transactions',
                      label: 'Transactions',
                      icon: <ArrowLeftRight size={16} />,
                      onClick: () => router.push(`/inventory/items/${(row as Item).id}/transactions`),
                    },
                  ]}
                  onEdit={() => startEdit(row as Item)}
                  onDelete={() => setPendingDelete(row as Item)}
                />
              </div>
            ),
          },
        ]}
        rows={list.rows}
        rowKey={(row) => String(row.id)}
        loading={loading}
        emptyMessage="No inventory items yet."
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
      />

      <FormDialog
        open={open}
        title={editing ? 'Edit item' : 'New item'}
        onClose={() => setOpen(false)}
        maxWidth="xl"
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel={editing ? 'Save changes' : 'Save'}
            submitting={saving}
            formId="inventory-item-form"
          />
        }
      >
        <form
          id="inventory-item-form"
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {formError && (
            <div className="sm:col-span-2">
              <ErrorBanner message={formError} />
            </div>
          )}
          <InputField
            label="Bin card number"
            value={form.bin_card_number}
            onChange={(e) => setForm({ ...form, bin_card_number: e.target.value })}
          />
          <InputField
            label="Item name"
            value={form.item_name}
            onChange={(e) => setForm({ ...form, item_name: e.target.value })}
            required
          />
          <Dropdown
            label="Unit"
            value={form.unit_id}
            onChange={(value) => setForm({ ...form, unit_id: value })}
            options={units.map((unit) => ({ value: unit.id, label: unit.name }))}
            placeholder="Select unit"
            clearable
          />
          <InputField
            label="Quantity"
            type="number"
            min={0}
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
          <InputField
            label="Minimum quantity"
            type="number"
            min={0}
            value={form.min_quantity}
            onChange={(e) => setForm({ ...form, min_quantity: e.target.value })}
          />
          <InputField
            label="Unit price"
            type="number"
            min={0}
            step="0.01"
            value={form.unit_price}
            onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
          />
          <InputField label="Total price" value={String(totalPrice)} readOnly />
          <div className="sm:col-span-2">
            <TextAreaField
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>
        </form>
      </FormDialog>
      <DetailDialog
        open={Boolean(viewing)}
        title={viewing?.item_name || 'Item'}
        onClose={() => setViewing(null)}
        rows={
          viewing
            ? [
                { label: 'Bin card', value: viewing.bin_card_number },
                { label: 'Unit', value: viewing.unit_label },
                { label: 'Quantity', value: String(viewing.quantity) },
                { label: 'Minimum', value: String(viewing.min_quantity) },
                { label: 'Unit price', value: String(viewing.unit_price) },
                { label: 'Total price', value: String(viewing.total_price) },
                { label: 'Description', value: viewing.description },
              ]
            : []
        }
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete item"
        message={pendingDelete ? `Delete ${pendingDelete.item_name}? Its stock movements will be removed too.` : ''}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          const item = pendingDelete;
          setPendingDelete(null);
          await remove(item);
        }}
      />
    </>
  );
}
