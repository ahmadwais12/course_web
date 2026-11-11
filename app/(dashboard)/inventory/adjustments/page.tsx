'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { dateLabel } from '@/lib/display';

type AdjustmentRow = {
  id: string;
  item_id: string;
  item_name: string;
  bin_card_number: string;
  unit_label: string;
  quantity_change: number;
  on_hand: number;
  reason: string;
  note: string;
  adjusted_at: string;
  created_at: string;
};

type Option = { value: string; label: string };

type FormState = {
  itemId: string;
  quantityChange: string;
  reason: string;
  adjustedAt: string;
  note: string;
};

const REASONS = [
  { value: 'count', label: 'Physical count' },
  { value: 'damage', label: 'Damage' },
  { value: 'loss', label: 'Loss' },
  { value: 'return', label: 'Returned to supplier' },
  { value: 'correction', label: 'Data correction' },
  { value: 'other', label: 'Other' },
];

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): FormState => ({
  itemId: '',
  quantityChange: '',
  reason: 'count',
  adjustedAt: today(),
  note: '',
});

function signed(value: number) {
  return `${value > 0 ? '+' : ''}${value}`;
}

export default function AdjustmentsPage() {
  const [rows, setRows] = useState<AdjustmentRow[]>([]);
  const [items, setItems] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [itemFilter, setItemFilter] = useState('');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdjustmentRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pendingDelete, setPendingDelete] = useState<AdjustmentRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [adjustmentRes, itemRes] = await Promise.all([
        fetch('/api/inventory/adjustments'),
        fetch('/api/inventory/items'),
      ]);
      const [adjustmentData, itemData] = await Promise.all([
        adjustmentRes.json(),
        itemRes.json(),
      ]);
      if (!adjustmentRes.ok) {
        throw new Error(adjustmentData.error || 'Failed to load adjustments');
      }
      setRows(Array.isArray(adjustmentData) ? adjustmentData : []);
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
      const message = e instanceof Error ? e.message : 'Failed to load adjustments';
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
    items: rows as (AdjustmentRow & Record<string, unknown>)[],
    searchKeys: ['item_name', 'bin_card_number', 'note', 'reason'],
    filterKey: `${reason}|${itemFilter}`,
    filterFn: (row) =>
      (!reason || row.reason === reason) && (!itemFilter || row.item_id === itemFilter),
  });

  const stats = useMemo(
    () => ({
      total: rows.length,
      increases: rows.filter((row) => row.quantity_change > 0).length,
      decreases: rows.filter((row) => row.quantity_change < 0).length,
      net: rows.reduce((sum, row) => sum + row.quantity_change, 0),
    }),
    [rows]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (row: AdjustmentRow) => {
    setEditing(row);
    setForm({
      itemId: row.item_id,
      quantityChange: String(row.quantity_change),
      reason: row.reason,
      adjustedAt: row.adjusted_at,
      note: row.note,
    });
    setFormError(null);
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.itemId) {
      setFormError('Choose the item to adjust');
      return;
    }
    const change = Number(form.quantityChange);
    if (!Number.isFinite(change) || change === 0) {
      setFormError('Enter a non-zero quantity change');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.adjustedAt)) {
      setFormError('Adjustment date is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        editing ? `/api/inventory/adjustments/${editing.id}` : '/api/inventory/adjustments',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_id: form.itemId,
            quantity_change: change,
            reason: form.reason,
            adjusted_at: form.adjustedAt,
            note: form.note,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save adjustment');
      toast.success(editing ? 'Adjustment updated' : 'Stock adjusted');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save adjustment');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: AdjustmentRow) => {
    try {
      const res = await fetch(`/api/inventory/adjustments/${row.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete adjustment');
      toast.success('Adjustment deleted');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete adjustment');
    }
  };

  return (
    <>
      <ListPageShell
        title="Adjustments"
        description="Correct stock quantities after counts, damage, loss, or data errors."
        primaryAction={{ label: 'New adjustment', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search item, bin card, or note…"
        filters={[
          { key: 'reason', label: 'Reason', value: reason, options: REASONS, onChange: setReason },
          { key: 'item', label: 'Item', value: itemFilter, options: items, onChange: setItemFilter },
        ]}
        onResetFilters={() => {
          list.reset();
          setReason('');
          setItemFilter('');
        }}
        loading={loading}
        columns={[
          {
            key: 'item',
            header: 'Item',
            render: (row) => (
              <div>
                <div className="font-semibold">{row.item_name}</div>
                <div className="text-xs text-muted-foreground">
                  {[row.bin_card_number, row.unit_label].filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
            ),
          },
          {
            key: 'change',
            header: 'Change',
            align: 'center',
            render: (row) => (
              <span
                className={
                  row.quantity_change > 0
                    ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                    : 'font-semibold text-destructive'
                }
              >
                {signed(row.quantity_change)}
              </span>
            ),
          },
          {
            key: 'onHand',
            header: 'On hand',
            align: 'center',
            render: (row) => `${row.on_hand}${row.unit_label ? ` ${row.unit_label}` : ''}`,
          },
          {
            key: 'reason',
            header: 'Reason',
            render: (row) => (
              <StatusChip label={row.reason} tone={row.reason === 'damage' || row.reason === 'loss' ? 'purple' : 'blue'} />
            ),
          },
          {
            key: 'note',
            header: 'Note',
            render: (row) => (
              <span className="block max-w-[20rem] truncate" title={row.note}>
                {row.note || '—'}
              </span>
            ),
          },
          {
            key: 'date',
            header: 'Adjusted',
            render: (row) => dateLabel(row.adjusted_at),
          },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (row) => (
              <RowActions onEdit={() => openEdit(row)} onDelete={() => setPendingDelete(row)} />
            ),
          },
        ]}
        rows={list.rows as AdjustmentRow[]}
        rowKey={(row) => row.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No stock adjustments yet. Use one after a physical count or when stock is damaged."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Adjustments" value={stats.total} accent="blue" />
          <StatCard label="Increases" value={stats.increases} accent="green" />
          <StatCard label="Decreases" value={stats.decreases} accent="purple" />
          <StatCard label="Net change" value={signed(stats.net)} accent="gold" />
        </div>
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={open}
        title={editing ? 'Edit adjustment' : 'New adjustment'}
        onClose={() => setOpen(false)}
        maxWidth="lg"
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel={editing ? 'Save changes' : 'Apply adjustment'}
            submitting={saving}
            formId="adjustment-form"
          />
        }
      >
        <form id="adjustment-form" onSubmit={submit} className="space-y-4">
          <Dropdown
            label="Item"
            required
            value={form.itemId}
            onChange={(value) => setForm((prev) => ({ ...prev, itemId: value }))}
            options={items}
            placeholder="Choose an item"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <InputField
              label="Quantity change"
              required
              type="number"
              step="any"
              value={form.quantityChange}
              onChange={(e) => setForm((prev) => ({ ...prev, quantityChange: e.target.value }))}
              placeholder="e.g. -3 or 12"
              hint="Use a negative number to reduce stock."
            />
            <Dropdown
              label="Reason"
              required
              value={form.reason}
              onChange={(value) => setForm((prev) => ({ ...prev, reason: value }))}
              options={REASONS}
            />
            <InputField
              label="Date"
              required
              type="date"
              value={form.adjustedAt}
              onChange={(e) => setForm((prev) => ({ ...prev, adjustedAt: e.target.value }))}
            />
          </div>
          <TextAreaField
            label="Note"
            value={form.note}
            onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            placeholder="What was counted or what happened to the stock"
          />
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete adjustment"
        message={
          pendingDelete
            ? `Delete this ${signed(pendingDelete.quantity_change)} adjustment for ${pendingDelete.item_name}? Its stock effect will be reversed.`
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
