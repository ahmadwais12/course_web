'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import {
  ConfirmDialog,
  DetailDialog,
  Dropdown,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  RowActions,
  StatusChip,
  TextAreaField,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';

type Item = { id: string; item_name: string; quantity: number };
type Warehouse = { id: string; name: string };
type Movement = {
  id: string;
  item_id: string;
  item_name: string;
  transaction_type: 'in' | 'out';
  invoice_number: string;
  quantity: number;
  price: number;
  employee_id_number: string;
  holder_name: string;
  transaction_date: string;
  department: string;
  location: string;
  transaction_description: string;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function MovementsPage({ type }: { type: 'in' | 'out' }) {
  const isOut = type === 'out';
  const [rows, setRows] = useState<Movement[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemFilter, setItemFilter] = useState('');

  useEffect(() => {
    const item = new URLSearchParams(window.location.search).get('item');
    if (item) setItemFilter(item);
  }, []);
  const [locationFilter, setLocationFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Movement | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Movement | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Movement | null>(null);
  const [form, setForm] = useState({
    item_id: '',
    quantity: '',
    price: '',
    invoice_number: '',
    employee_id_number: '',
    holder_name: '',
    transaction_date: today(),
    department: '',
    location: '',
    transaction_description: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, itemRes, whRes] = await Promise.all([
        fetch(`/api/inventory/transactions?type=${type}`),
        fetch('/api/inventory/items'),
        fetch('/api/inventory/warehouses'),
      ]);
      const txData = await txRes.json();
      const itemData = await itemRes.json();
      const whData = await whRes.json();
      if (!txRes.ok) throw new Error(txData.error || 'Failed to load movements');
      setRows(Array.isArray(txData) ? txData : []);
      setItems(Array.isArray(itemData) ? itemData : []);
      setWarehouses(Array.isArray(whData) ? whData : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load movements');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

  const filterFn = useCallback(
    (row: Movement) => {
      if (itemFilter && row.item_id !== itemFilter) return false;
      if (locationFilter && row.location !== locationFilter) return false;
      return true;
    },
    [itemFilter, locationFilter]
  );

  const list = useListQuery({
    items: rows as (Movement & Record<string, unknown>)[],
    searchKeys: ['item_name', 'invoice_number', 'holder_name', 'department', 'transaction_description'],
    filterKey: `${itemFilter}|${locationFilter}`,
    filterFn: filterFn as (row: Movement & Record<string, unknown>) => boolean,
  });

  const blank = () => ({
    item_id: '',
    quantity: '',
    price: isOut ? '0' : '',
    invoice_number: '',
    employee_id_number: '',
    holder_name: '',
    transaction_date: today(),
    department: '',
    location: '',
    transaction_description: '',
  });

  const startCreate = () => {
    setEditing(null);
    setForm(blank());
    setFormError(null);
    setOpen(true);
  };

  const startEdit = (row: Movement) => {
    setEditing(row);
    setForm({
      item_id: row.item_id,
      quantity: String(row.quantity),
      price: String(row.price),
      invoice_number: row.invoice_number,
      employee_id_number: row.employee_id_number,
      holder_name: row.holder_name,
      transaction_date: row.transaction_date,
      department: row.department,
      location: row.location,
      transaction_description: row.transaction_description,
    });
    setFormError(null);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(editing ? `/api/inventory/transactions/${editing.id}` : '/api/inventory/transactions', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          transaction_type: type,
          quantity: Number(form.quantity),
          price: form.price === '' ? null : Number(form.price),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success(editing ? 'Movement updated' : isOut ? 'Stock issued' : 'Stock received');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Movement) => {
    const res = await fetch(`/api/inventory/transactions/${row.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || 'Delete failed');
      return;
    }
    toast.success('Movement reversed');
    await load();
  };

  return (
    <>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <ListPageShell
        title={isOut ? 'Stock Out' : 'Stock In'}
        description={
          isOut
            ? 'Issue stock. Quantity cannot be higher than what is currently on hand. Description is required. An empty price is stored as 0.'
            : 'Receive stock. Quantity is added to the item on-hand balance. Description and date are required.'
        }
        primaryAction={{ label: isOut ? 'New issue' : 'New receipt', onClick: startCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search item, invoice, holder, or description…"
        filters={[
          {
            key: 'item',
            label: 'Item',
            value: itemFilter,
            onChange: setItemFilter,
            options: items.map((item) => ({ value: item.id, label: item.item_name })),
          },
          {
            key: 'location',
            label: 'Warehouse',
            value: locationFilter,
            onChange: setLocationFilter,
            options: warehouses.map((row) => ({ value: row.name, label: row.name })),
          },
        ]}
        onResetFilters={() => {
          setItemFilter('');
          setLocationFilter('');
          list.reset();
        }}
        columns={[
          { key: 'transaction_date', header: 'Date' },
          { key: 'item_name', header: 'Item' },
          {
            key: 'quantity',
            header: 'Quantity',
            render: (row) => (
              <span className="inline-flex items-center gap-2">
                {row.quantity}
                <StatusChip tone={isOut ? 'gold' : 'green'} label={isOut ? 'Out' : 'In'} />
              </span>
            ),
          },
          { key: 'holder_name', header: 'Holder', render: (row) => row.holder_name || '—' },
          { key: 'department', header: 'Department', render: (row) => row.department || '—' },
          { key: 'location', header: 'Warehouse', render: (row) => row.location || '—' },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) => (
              <div className="flex justify-end">
                <RowActions
                  items={[{ key: 'view', label: 'Details', icon: <Eye size={16} />, onClick: () => setViewing(row as Movement) }]}
                  onEdit={() => startEdit(row as Movement)}
                  onDelete={() => setPendingDelete(row as Movement)}
                />
              </div>
            ),
          },
        ]}
        rows={list.rows}
        rowKey={(row) => String(row.id)}
        loading={loading}
        emptyMessage={isOut ? 'No stock issues yet.' : 'No stock receipts yet.'}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
      />

      <FormDialog
        open={open}
        title={editing ? 'Edit movement' : isOut ? 'Issue stock' : 'Receive stock'}
        onClose={() => setOpen(false)}
        maxWidth="xl"
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel="Save"
            submitting={saving}
            formId="inventory-movement-form"
          />
        }
      >
        <form
          id="inventory-movement-form"
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
          <Dropdown
            label="Item"
            value={form.item_id}
            onChange={(value) => setForm({ ...form, item_id: value })}
            options={items.map((item) => ({
              value: item.id,
              label: `${item.item_name} (on hand ${item.quantity})`,
            }))}
            placeholder="Select item"
            required
            disabled={Boolean(editing)}
          />
          <InputField
            label="Date"
            type="date"
            value={form.transaction_date}
            onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
            required
          />
          <InputField
            label="Quantity"
            type="number"
            min={0}
            step="0.01"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            required
          />
          <InputField
            label={isOut ? 'Price (empty becomes 0)' : 'Price'}
            type="number"
            min={0}
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <InputField
            label="Invoice number"
            value={form.invoice_number}
            onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
          />
          <InputField
            label="Employee ID"
            value={form.employee_id_number}
            onChange={(e) => setForm({ ...form, employee_id_number: e.target.value })}
          />
          <InputField
            label="Holder"
            value={form.holder_name}
            onChange={(e) => setForm({ ...form, holder_name: e.target.value })}
          />
          <InputField
            label="Department"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />
          <Dropdown
            label="Warehouse"
            value={form.location}
            onChange={(value) => setForm({ ...form, location: value })}
            options={warehouses.map((row) => ({ value: row.name, label: row.name }))}
            placeholder="Select warehouse"
            clearable
          />
          <div className="sm:col-span-2">
            <TextAreaField
              label="Description"
              value={form.transaction_description}
              onChange={(e) => setForm({ ...form, transaction_description: e.target.value })}
              required
              rows={3}
            />
          </div>
        </form>
      </FormDialog>
      <DetailDialog
        open={Boolean(viewing)}
        title={viewing?.item_name || 'Movement'}
        onClose={() => setViewing(null)}
        rows={
          viewing
            ? [
                { label: 'Type', value: viewing.transaction_type === 'out' ? 'Stock out' : 'Stock in' },
                { label: 'Invoice', value: viewing.invoice_number },
                { label: 'Quantity', value: String(viewing.quantity) },
                { label: 'Price', value: String(viewing.price) },
                { label: 'Date', value: viewing.transaction_date },
                { label: 'Employee ID', value: viewing.employee_id_number },
                { label: 'Holder', value: viewing.holder_name },
                { label: 'Department', value: viewing.department },
                { label: 'Warehouse', value: viewing.location },
                { label: 'Description', value: viewing.transaction_description },
              ]
            : []
        }
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete movement"
        message="Delete this movement? On-hand quantity will be reversed."
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
