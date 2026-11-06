'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Eye } from 'lucide-react';
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
  type SelectOption,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { downloadCsv } from '@/lib/csv';
import { TRANSACTION_CSV_COLUMNS, type InventoryTransaction } from '@/lib/inventory-options';

type Item = {
  id: string;
  item_name: string;
  bin_card_number: string;
  unit_label: string;
  quantity: number;
  min_quantity: number;
};
type Named = { id: string; name: string };

const today = () => new Date().toISOString().slice(0, 10);

const blank = () => ({
  transaction_type: 'in' as 'in' | 'out',
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

/** Keeps a value that was typed before the lists existed selectable when editing. */
function withCurrent(options: SelectOption[], current: string): SelectOption[] {
  if (!current || options.some((option) => option.value === current)) return options;
  return [{ value: current, label: current }, ...options];
}

export default function ItemTransactionsPage({ itemId }: { itemId: string }) {
  const [item, setItem] = useState<Item | null>(null);
  const [rows, setRows] = useState<InventoryTransaction[]>([]);
  const [holders, setHolders] = useState<Named[]>([]);
  const [departments, setDepartments] = useState<Named[]>([]);
  const [warehouses, setWarehouses] = useState<Named[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryTransaction | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<InventoryTransaction | null>(null);
  const [pendingDelete, setPendingDelete] = useState<InventoryTransaction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemRes, txRes] = await Promise.all([
        fetch(`/api/inventory/items/${itemId}`),
        fetch(`/api/inventory/transactions?item_id=${encodeURIComponent(itemId)}`),
      ]);
      const itemData = await itemRes.json();
      const txData = await txRes.json();
      if (!itemRes.ok) throw new Error(itemData.error || 'Item not found');
      if (!txRes.ok) throw new Error(txData.error || 'Failed to load transactions');
      setItem(itemData);
      setRows(Array.isArray(txData) ? txData : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transactions');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      const [holderRes, deptRes, whRes] = await Promise.all([
        fetch('/api/inventory/holders'),
        fetch('/api/inventory/properties?type=Department'),
        fetch('/api/inventory/warehouses'),
      ]);
      const [holderData, deptData, whData] = await Promise.all([
        holderRes.json().catch(() => []),
        deptRes.json().catch(() => []),
        whRes.json().catch(() => []),
      ]);
      if (Array.isArray(holderData)) {
        setHolders(
          holderData.map((row: { id: string; first_name: string; last_name: string }) => ({
            id: row.id,
            name: `${row.first_name} ${row.last_name}`.trim(),
          }))
        );
      }
      if (Array.isArray(deptData)) {
        setDepartments(deptData.map((row: { id: string; description: string }) => ({ id: row.id, name: row.description })));
      }
      if (Array.isArray(whData)) setWarehouses(whData);
    })();
  }, []);

  const filterFn = useCallback(
    (row: InventoryTransaction) => !typeFilter || row.transaction_type === typeFilter,
    [typeFilter]
  );

  const list = useListQuery({
    items: rows as (InventoryTransaction & Record<string, unknown>)[],
    searchKeys: ['invoice_number', 'holder_name', 'department', 'location', 'transaction_description'],
    filterKey: typeFilter,
    filterFn: filterFn as (row: InventoryTransaction & Record<string, unknown>) => boolean,
  });

  const holderOptions = useMemo(
    () => withCurrent(holders.map((row) => ({ value: row.name, label: row.name })), form.holder_name),
    [holders, form.holder_name]
  );
  const departmentOptions = useMemo(
    () => withCurrent(departments.map((row) => ({ value: row.name, label: row.name })), form.department),
    [departments, form.department]
  );
  const locationOptions = useMemo(
    () => withCurrent(warehouses.map((row) => ({ value: row.name, label: row.name })), form.location),
    [warehouses, form.location]
  );

  const startCreate = () => {
    setEditing(null);
    setForm(blank());
    setFormError(null);
    setOpen(true);
  };

  const startEdit = (row: InventoryTransaction) => {
    setEditing(row);
    setForm({
      transaction_type: row.transaction_type,
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
          item_id: itemId,
          quantity: Number(form.quantity),
          price: form.price === '' ? null : Number(form.price),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success(editing ? 'Transaction updated' : 'Transaction added');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: InventoryTransaction) => {
    const res = await fetch(`/api/inventory/transactions/${row.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || 'Delete failed');
      return;
    }
    toast.success('Transaction reversed');
    await load();
  };

  const exportRows = () => {
    const name = (item?.item_name || 'item').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase();
    downloadCsv(`inventory-transactions-${name}-${today()}`, list.filtered as InventoryTransaction[], TRANSACTION_CSV_COLUMNS);
  };

  const isOut = form.transaction_type === 'out';
  const onHandHint = item ? ` On hand: ${item.quantity}${item.unit_label ? ` ${item.unit_label}` : ''}.` : '';

  return (
    <>
      <div className="mb-3">
        <Link
          href="/inventory/items"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> Back to inventory items
        </Link>
      </div>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <ListPageShell
        title="Inventory transactions"
        description={
          item
            ? `${item.item_name}${item.bin_card_number ? ` · Bin card ${item.bin_card_number}` : ''}.${onHandHint} In adds to the balance; out subtracts and cannot exceed it.`
            : 'In and out movements for this item.'
        }
        primaryAction={item ? { label: 'Add transaction', onClick: startCreate } : undefined}
        secondaryActions={
          <PortButton onClick={exportRows} disabled={loading || list.total === 0}>
            <Download size={16} /> Export Excel
          </PortButton>
        }
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search invoice, holder, department, or description…"
        filters={[
          {
            key: 'type',
            label: 'Type',
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { value: 'in', label: 'In' },
              { value: 'out', label: 'Out' },
            ],
          },
        ]}
        onResetFilters={() => {
          setTypeFilter('');
          list.reset();
        }}
        columns={[
          {
            key: 'type',
            header: 'Type',
            render: (row) => (
              <StatusChip
                tone={row.transaction_type === 'out' ? 'gold' : 'green'}
                label={row.transaction_type === 'out' ? 'Out' : 'In'}
              />
            ),
          },
          { key: 'transaction_date', header: 'Date' },
          { key: 'quantity', header: 'Quantity' },
          { key: 'department', header: 'Department', render: (row) => row.department || '—' },
          { key: 'location', header: 'Location', render: (row) => row.location || '—' },
          { key: 'holder_name', header: 'Holder', render: (row) => row.holder_name || '—' },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) => (
              <div className="flex justify-end">
                <RowActions
                  items={[
                    {
                      key: 'view',
                      label: 'Details',
                      icon: <Eye size={16} />,
                      onClick: () => setViewing(row as InventoryTransaction),
                    },
                  ]}
                  onEdit={() => startEdit(row as InventoryTransaction)}
                  onDelete={() => setPendingDelete(row as InventoryTransaction)}
                />
              </div>
            ),
          },
        ]}
        rows={list.rows}
        rowKey={(row) => String(row.id)}
        loading={loading}
        emptyMessage="No transactions found."
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
      />

      <FormDialog
        open={open}
        title={editing ? 'Edit transaction' : 'Add transaction'}
        onClose={() => setOpen(false)}
        maxWidth="xl"
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel="Save"
            submitting={saving}
            formId="item-transaction-form"
          />
        }
      >
        <form
          id="item-transaction-form"
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {item && (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              {item.item_name}.{onHandHint}
            </p>
          )}
          {formError && (
            <div className="sm:col-span-2">
              <ErrorBanner message={formError} />
            </div>
          )}
          <Dropdown
            label="Transaction type"
            value={form.transaction_type}
            onChange={(value) => setForm({ ...form, transaction_type: value === 'out' ? 'out' : 'in' })}
            options={[
              { value: 'in', label: 'In (receive stock)' },
              { value: 'out', label: 'Out (issue stock)' },
            ]}
            required
          />
          <InputField
            label="Transaction date"
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
            label="Employee ID number"
            value={form.employee_id_number}
            onChange={(e) => setForm({ ...form, employee_id_number: e.target.value })}
          />
          <Dropdown
            label="Asset holder name"
            value={form.holder_name}
            onChange={(value) => setForm({ ...form, holder_name: value })}
            options={holderOptions}
            placeholder="Select asset holder"
            clearable
          />
          <Dropdown
            label="Department"
            value={form.department}
            onChange={(value) => setForm({ ...form, department: value })}
            options={departmentOptions}
            placeholder="Select department"
            clearable
          />
          <Dropdown
            label="Location"
            value={form.location}
            onChange={(value) => setForm({ ...form, location: value })}
            options={locationOptions}
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
        title={viewing ? `${viewing.transaction_type === 'out' ? 'Out' : 'In'} · ${viewing.transaction_date}` : 'Transaction'}
        onClose={() => setViewing(null)}
        rows={
          viewing
            ? [
                { label: 'Item', value: viewing.item_name },
                { label: 'Type', value: viewing.transaction_type === 'out' ? 'Out' : 'In' },
                { label: 'Quantity', value: String(viewing.quantity) },
                { label: 'Price', value: String(viewing.price) },
                { label: 'Invoice', value: viewing.invoice_number },
                { label: 'Employee ID', value: viewing.employee_id_number },
                { label: 'Holder', value: viewing.holder_name },
                { label: 'Department', value: viewing.department },
                { label: 'Location', value: viewing.location },
                { label: 'Description', value: viewing.transaction_description },
              ]
            : []
        }
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete transaction"
        message="Delete this transaction? The item's on-hand quantity will be reversed."
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
