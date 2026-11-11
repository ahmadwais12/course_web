'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ConfirmDialog,
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
import { compactMoney, dateLabel } from '@/lib/display';

type SupplierRow = {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  is_active: boolean;
  purchase_count: number;
  received_total: number;
  created_at: string;
  updated_at: string;
};

type FormState = {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
  isActive: true,
});

const toForm = (row: SupplierRow): FormState => ({
  name: row.name,
  contact_person: row.contact_person,
  phone: row.phone,
  email: row.email,
  address: row.address,
  notes: row.notes,
  isActive: row.is_active,
});

export default function SuppliersPage() {
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pendingDelete, setPendingDelete] = useState<SupplierRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/suppliers');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load suppliers');
      setRows(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load suppliers';
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
    items: rows as (SupplierRow & Record<string, unknown>)[],
    searchKeys: ['name', 'contact_person', 'phone', 'email', 'address'],
    filterKey: status,
    filterFn: (row) => !status || (status === 'active' ? row.is_active : !row.is_active),
  });

  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((row) => row.is_active).length,
      ordered: rows.reduce((sum, row) => sum + row.purchase_count, 0),
      received: rows.reduce((sum, row) => sum + row.received_total, 0),
    }),
    [rows]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (row: SupplierRow) => {
    setEditing(row);
    setForm(toForm(row));
    setFormError(null);
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Supplier name is required');
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError('Enter a valid supplier email');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        editing ? `/api/inventory/suppliers/${editing.id}` : '/api/inventory/suppliers',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, is_active: form.isActive }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save supplier');
      toast.success(editing ? 'Supplier updated' : 'Supplier created');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: SupplierRow) => {
    try {
      const res = await fetch(`/api/inventory/suppliers/${row.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete supplier');
      toast.success('Supplier deleted');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete supplier');
    }
  };

  return (
    <>
      <ListPageShell
        title="Suppliers"
        description="Vendors that provide inventory items, with their contact details and purchase history."
        primaryAction={{ label: 'New supplier', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search supplier, contact, phone, or email…"
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: status,
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ],
            onChange: setStatus,
          },
        ]}
        onResetFilters={() => {
          list.reset();
          setStatus('');
        }}
        loading={loading}
        columns={[
          {
            key: 'name',
            header: 'Supplier',
            render: (row) => (
              <div>
                <div className="font-semibold">{row.name}</div>
                <div className="text-xs text-muted-foreground">
                  {row.contact_person || row.email || row.phone || '—'}
                </div>
              </div>
            ),
          },
          {
            key: 'contact',
            header: 'Contact',
            render: (row) => (
              <div className="text-sm">
                <div>{row.phone || '—'}</div>
                <div className="text-xs text-muted-foreground">{row.email || '—'}</div>
              </div>
            ),
          },
          {
            key: 'address',
            header: 'Address',
            render: (row) => row.address || '—',
          },
          {
            key: 'purchases',
            header: 'Purchases',
            align: 'center',
            render: (row) => row.purchase_count,
          },
          {
            key: 'received',
            header: 'Received value',
            render: (row) => compactMoney(row.received_total),
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusChip
                label={row.is_active ? 'active' : 'inactive'}
                tone={statusToneFromValue(row.is_active ? 'active' : 'inactive')}
              />
            ),
          },
          {
            key: 'added',
            header: 'Added',
            render: (row) => dateLabel(row.created_at),
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
        rows={list.rows as SupplierRow[]}
        rowKey={(row) => row.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No suppliers yet. Add a vendor before creating purchase orders."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Suppliers" value={stats.total} accent="blue" />
          <StatCard label="Active" value={stats.active} accent="green" />
          <StatCard label="Purchase orders" value={stats.ordered} accent="gold" />
          <StatCard label="Received value" value={compactMoney(stats.received)} accent="purple" />
        </div>
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={open}
        title={editing ? 'Edit supplier' : 'New supplier'}
        onClose={() => setOpen(false)}
        maxWidth="xl"
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel={editing ? 'Save changes' : 'Create supplier'}
            submitting={saving}
            formId="supplier-form"
          />
        }
      >
        <form id="supplier-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Supplier name"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Afghan Office Supplies"
            />
            <InputField
              label="Contact person"
              value={form.contact_person}
              onChange={(e) => setForm((prev) => ({ ...prev, contact_person: e.target.value }))}
              placeholder="Full name"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+93 70 000 0000"
            />
            <InputField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="orders@supplier.com"
            />
          </div>
          <InputField
            label="Address"
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            placeholder="Street, city"
          />
          <TextAreaField
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Payment terms, delivery schedule, or other details"
          />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-border"
            />
            Active supplier
          </label>
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete supplier"
        message={
          pendingDelete
            ? `Delete ${pendingDelete.name}? This cannot be undone.`
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
