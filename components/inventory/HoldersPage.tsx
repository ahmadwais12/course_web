'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Package } from 'lucide-react';
import {
  ConfirmDialog,
  DetailDialog,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  RowActions,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';

type Holder = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  address: string;
  province: string;
  location: string;
};

const blank = {
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  address: '',
  province: '',
  location: '',
};

export default function HoldersPage() {
  const router = useRouter();
  const [items, setItems] = useState<Holder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Holder | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Holder | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Holder | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/holders');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load holders');
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load holders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = useListQuery({
    items: items as (Holder & Record<string, unknown>)[],
    searchKeys: ['first_name', 'last_name', 'email', 'phone_number', 'province', 'location'],
  });

  const set = (key: keyof typeof blank, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(editing ? `/api/inventory/holders/${editing.id}` : '/api/inventory/holders', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success(editing ? 'Holder updated' : 'Holder created');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Holder) => {
    const res = await fetch(`/api/inventory/holders/${row.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || 'Delete failed');
      return;
    }
    toast.success('Holder deleted');
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
        title="Asset Holders"
        description="People and offices that hold a registered asset. Assets pick a holder from this list."
        primaryAction={{
          label: 'New holder',
          onClick: () => {
            setEditing(null);
            setForm(blank);
            setFormError(null);
            setOpen(true);
          },
        }}
        search={list.search}
        onSearchChange={list.setSearch}
        columns={[
          { key: 'first_name', header: 'First name' },
          { key: 'last_name', header: 'Last name' },
          { key: 'email', header: 'Email', render: (row) => row.email || '—' },
          { key: 'phone_number', header: 'Phone', render: (row) => row.phone_number || '—' },
          { key: 'province', header: 'Province', render: (row) => row.province || '—' },
          { key: 'location', header: 'Location', render: (row) => row.location || '—' },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) => (
              <div className="flex justify-end">
                <RowActions
                  onEdit={() => {
                    const holder = row as Holder;
                    setEditing(holder);
                    setForm({
                      first_name: holder.first_name,
                      last_name: holder.last_name,
                      email: holder.email,
                      phone_number: holder.phone_number,
                      address: holder.address,
                      province: holder.province,
                      location: holder.location,
                    });
                    setFormError(null);
                    setOpen(true);
                  }}
                  items={[
                    { key: 'view', label: 'Details', icon: <Eye size={16} />, onClick: () => setViewing(row as Holder) },
                    {
                      key: 'assets',
                      label: 'View assets',
                      icon: <Package size={16} />,
                      onClick: () => router.push(`/inventory/assets?holder=${(row as Holder).id}`),
                    },
                  ]}
                  onDelete={() => setPendingDelete(row as Holder)}
                />
              </div>
            ),
          },
        ]}
        rows={list.rows}
        rowKey={(row) => String(row.id)}
        loading={loading}
        emptyMessage="No asset holders yet."
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
      />
      <FormDialog
        open={open}
        title={editing ? 'Edit holder' : 'New holder'}
        onClose={() => setOpen(false)}
        maxWidth="xl"
        footer={<FormDialogFooter onCancel={() => setOpen(false)} submitLabel="Save" submitting={saving} formId="holder-form" />}
      >
        <form
          id="holder-form"
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
          <InputField label="First name" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
          <InputField label="Last name" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
          <InputField label="Email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          <InputField label="Phone" value={form.phone_number} onChange={(e) => set('phone_number', e.target.value)} />
          <InputField label="Province" value={form.province} onChange={(e) => set('province', e.target.value)} />
          <InputField label="Location" value={form.location} onChange={(e) => set('location', e.target.value)} />
          <div className="sm:col-span-2">
            <InputField label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
        </form>
      </FormDialog>
      <DetailDialog
        open={Boolean(viewing)}
        title={viewing ? `${viewing.first_name} ${viewing.last_name}`.trim() : 'Holder'}
        onClose={() => setViewing(null)}
        rows={
          viewing
            ? [
                { label: 'First name', value: viewing.first_name },
                { label: 'Last name', value: viewing.last_name },
                { label: 'Email', value: viewing.email },
                { label: 'Phone', value: viewing.phone_number },
                { label: 'Province', value: viewing.province },
                { label: 'Location', value: viewing.location },
                { label: 'Address', value: viewing.address },
              ]
            : []
        }
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete holder"
        message={pendingDelete ? `Delete ${pendingDelete.first_name} ${pendingDelete.last_name}?` : ''}
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
