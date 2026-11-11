'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleSlash } from 'lucide-react';
import {
  ConfirmDialog,
  Dropdown,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  RowActions,
  StatCard,
  StatusChip,
  TextAreaField,
  statusToneFromValue,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { compactMoney, dateLabel, money } from '@/lib/display';

type PurchaseRow = {
  id: string;
  reference: string;
  supplier_id: string | null;
  supplier_name: string;
  item_id: string;
  item_name: string;
  bin_card_number: string;
  unit_label: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  order_date: string;
  expected_date: string;
  received_date: string;
  notes: string;
  created_at: string;
};

type Option = { value: string; label: string };

type FormState = {
  supplierId: string;
  itemId: string;
  quantity: string;
  unitPrice: string;
  status: string;
  orderDate: string;
  expectedDate: string;
  receivedDate: string;
  notes: string;
};

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
];

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): FormState => ({
  supplierId: '',
  itemId: '',
  quantity: '1',
  unitPrice: '0',
  status: 'draft',
  orderDate: today(),
  expectedDate: '',
  receivedDate: '',
  notes: '',
});

export default function PurchasesPage() {
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [items, setItems] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [itemFilter, setItemFilter] = useState('');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pendingDelete, setPendingDelete] = useState<PurchaseRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [purchaseRes, supplierRes, itemRes] = await Promise.all([
        fetch('/api/inventory/purchases'),
        fetch('/api/inventory/suppliers'),
        fetch('/api/inventory/items'),
      ]);
      const [purchaseData, supplierData, itemData] = await Promise.all([
        purchaseRes.json(),
        supplierRes.json(),
        itemRes.json(),
      ]);
      if (!purchaseRes.ok) {
        throw new Error(purchaseData.error || 'Failed to load purchases');
      }
      setRows(Array.isArray(purchaseData) ? purchaseData : []);
      setSuppliers(
        Array.isArray(supplierData)
          ? supplierData
              .filter((row: { is_active?: boolean }) => row.is_active !== false)
              .map((row: { id: string; name: string }) => ({ value: row.id, label: row.name }))
          : []
      );
      setItems(
        Array.isArray(itemData)
          ? itemData.map((row: { id: string; item_name: string }) => ({
              value: row.id,
              label: row.item_name,
            }))
          : []
      );
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load purchases';
      setRows([]);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const list = useListQuery({
    items: rows as (PurchaseRow & Record<string, unknown>)[],
    searchKeys: ['reference', 'supplier_name', 'item_name', 'notes'],
    filterKey: `${status}|${supplierFilter}|${itemFilter}`,
    filterFn: (row) =>
      (!status || row.status === status) &&
      (!supplierFilter || row.supplier_id === supplierFilter) &&
      (!itemFilter || row.item_id === itemFilter),
  });

  const stats = useMemo(
    () => ({
      total: rows.length,
      ordered: rows.filter((row) => row.status === 'ordered').length,
      received: rows.filter((row) => row.status === 'received').length,
      spend: rows
        .filter((row) => row.status === 'received')
        .reduce((sum, row) => sum + row.total_price, 0),
    }),
    [rows]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (row: PurchaseRow) => {
    setEditing(row);
    setForm({
      supplierId: row.supplier_id ?? '',
      itemId: row.item_id,
      quantity: String(row.quantity),
      unitPrice: String(row.unit_price),
      status: row.status,
      orderDate: row.order_date,
      expectedDate: row.expected_date || '',
      receivedDate: row.received_date || '',
      notes: row.notes,
    });
    setFormError(null);
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.itemId) {
      setFormError('Choose an item for this purchase');
      return;
    }
    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setFormError('Quantity must be greater than zero');
      return;
    }
    const unitPrice = Number(form.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setFormError('Unit price must be zero or more');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.orderDate)) {
      setFormError('Order date is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        editing ? `/api/inventory/purchases/${editing.id}` : '/api/inventory/purchases',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplier_id: form.supplierId || null,
            item_id: form.itemId,
            quantity,
            unit_price: unitPrice,
            status: form.status,
            order_date: form.orderDate,
            expected_date: form.expectedDate,
            received_date: form.receivedDate,
            notes: form.notes,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save purchase');
      toast.success(editing ? 'Purchase updated' : 'Purchase created');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save purchase');
    } finally {
      setSaving(false);
    }
  };

  const setStatusFor = async (row: PurchaseRow, next: string) => {
    try {
      const res = await fetch(`/api/inventory/purchases/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: row.supplier_id,
          item_id: row.item_id,
          quantity: row.quantity,
          unit_price: row.unit_price,
          status: next,
          order_date: row.order_date,
          expected_date: row.expected_date || '',
          received_date: row.received_date || '',
          notes: row.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update purchase');
      toast.success(
        next === 'received' ? 'Purchase received — stock updated' : 'Purchase updated'
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update purchase');
    }
  };

  const remove = async (row: PurchaseRow) => {
    try {
      const res = await fetch(`/api/inventory/purchases/${row.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete purchase');
      toast.success('Purchase deleted');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete purchase');
    }
  };

  return (
    <>
      <ListPageShell
        title="Purchases"
        description="Purchase orders from suppliers. Receiving an order adds its quantity to stock."
        primaryAction={{ label: 'New purchase', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search reference, supplier, or item…"
        filters={[
          { key: 'status', label: 'Status', value: status, options: STATUS_OPTIONS, onChange: setStatus },
          {
            key: 'supplier',
            label: 'Supplier',
            value: supplierFilter,
            options: suppliers,
            onChange: setSupplierFilter,
          },
          { key: 'item', label: 'Item', value: itemFilter, options: items, onChange: setItemFilter },
        ]}
        onResetFilters={() => {
          list.reset();
          setStatus('');
          setSupplierFilter('');
          setItemFilter('');
        }}
        loading={loading}
        columns={[
          {
            key: 'reference',
            header: 'Purchase',
            render: (row) => (
              <div>
                <div className="font-semibold">{row.reference}</div>
                <div className="text-xs text-muted-foreground">{row.supplier_name}</div>
              </div>
            ),
          },
          {
            key: 'item',
            header: 'Item',
            render: (row) => (
              <div>
                <div>{row.item_name}</div>
                <div className="text-xs text-muted-foreground">
                  {[row.bin_card_number, row.unit_label].filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
            ),
          },
          {
            key: 'quantity',
            header: 'Quantity',
            align: 'center',
            render: (row) => `${row.quantity}${row.unit_label ? ` ${row.unit_label}` : ''}`,
          },
          {
            key: 'unitPrice',
            header: 'Unit price',
            render: (row) => money(row.unit_price),
          },
          {
            key: 'total',
            header: 'Total',
            render: (row) => money(row.total_price),
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusChip label={row.status} tone={statusToneFromValue(row.status)} />
            ),
          },
          {
            key: 'dates',
            header: 'Dates',
            render: (row) => (
              <div className="text-xs">
                <div>Ordered {dateLabel(row.order_date)}</div>
                <div className="text-muted-foreground">
                  {row.received_date
                    ? `Received ${dateLabel(row.received_date)}`
                    : row.expected_date
                      ? `Expected ${dateLabel(row.expected_date)}`
                      : 'Not received'}
                </div>
              </div>
            ),
          },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (row) => (
              <RowActions
                onEdit={() => openEdit(row)}
                overflow={[
                  ...(row.status === 'draft' || row.status === 'ordered'
                    ? [
                        {
                          key: 'receive',
                          label: 'Mark received',
                          icon: <CheckCircle2 size={16} />,
                          onClick: () => void setStatusFor(row, 'received'),
                        },
                      ]
                    : []),
                  ...(row.status !== 'cancelled'
                    ? [
                        {
                          key: 'cancel',
                          label:
                            row.status === 'received' ? 'Cancel & reverse stock' : 'Cancel order',
                          icon: <CircleSlash size={16} />,
                          onClick: () => void setStatusFor(row, 'cancelled'),
                          danger: row.status === 'received',
                        },
                      ]
                    : []),
                ]}
                onDelete={() => setPendingDelete(row)}
              />
            ),
          },
        ]}
        rows={list.rows as PurchaseRow[]}
        rowKey={(row) => row.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No purchase orders yet. Create one to restock an item from a supplier."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Purchase orders" value={stats.total} accent="blue" />
          <StatCard label="Ordered" value={stats.ordered} accent="gold" />
          <StatCard label="Received" value={stats.received} accent="green" />
          <StatCard label="Received value" value={compactMoney(stats.spend)} accent="purple" />
        </div>
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={open}
        title={editing ? `Edit ${editing.reference}` : 'New purchase'}
        onClose={() => setOpen(false)}
        maxWidth="xl"
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel={editing ? 'Save changes' : 'Create purchase'}
            submitting={saving}
            formId="purchase-form"
          />
        }
      >
        <form id="purchase-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Dropdown
              label="Supplier"
              value={form.supplierId}
              onChange={(value) => setForm((prev) => ({ ...prev, supplierId: value }))}
              options={suppliers}
              placeholder="Unassigned"
              clearable
            />
            <Dropdown
              label="Item"
              required
              value={form.itemId}
              onChange={(value) => setForm((prev) => ({ ...prev, itemId: value }))}
              options={items}
              placeholder="Choose an item"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <InputField
              label="Quantity"
              required
              type="number"
              min="0.01"
              step="any"
              value={form.quantity}
              onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
            />
            <InputField
              label="Unit price"
              type="number"
              min="0"
              step="any"
              value={form.unitPrice}
              onChange={(e) => setForm((prev) => ({ ...prev, unitPrice: e.target.value }))}
            />
            <Dropdown
              label="Status"
              value={form.status}
              onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
              options={STATUS_OPTIONS}
              hint="Received purchases add stock immediately."
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <InputField
              label="Order date"
              required
              type="date"
              value={form.orderDate}
              onChange={(e) => setForm((prev) => ({ ...prev, orderDate: e.target.value }))}
            />
            <InputField
              label="Expected date"
              type="date"
              value={form.expectedDate}
              onChange={(e) => setForm((prev) => ({ ...prev, expectedDate: e.target.value }))}
            />
            <InputField
              label="Received date"
              type="date"
              value={form.receivedDate}
              onChange={(e) => setForm((prev) => ({ ...prev, receivedDate: e.target.value }))}
            />
          </div>
          <TextAreaField
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Delivery instructions, invoice number, or remarks"
          />
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete purchase"
        message={
          pendingDelete
            ? pendingDelete.status === 'received'
              ? `Delete ${pendingDelete.reference}? Its received stock will be reversed.`
              : `Delete ${pendingDelete.reference}? This cannot be undone.`
            : ''
        }
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          const row = pendingDelete;
          setPendingDelete(null);
          await remove(row);
        }}
      />
    </>
  );
}
