'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Dropdown,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  TextAreaField,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';

type Transfer = {
  id: string;
  asset_id: string;
  asset_name: string;
  from_holder: string;
  to_holder: string;
  from_department: string;
  to_department: string;
  from_location: string;
  to_location: string;
  from_province: string;
  to_province: string;
  note: string;
  created_at: string;
};

type Asset = { id: string; asset_name: string; holder_id: string | null; department: string; location: string; province: string };
type Holder = { id: string; first_name: string; last_name: string };

export default function TransfersPage() {
  const search = useSearchParams();
  const preset = search.get('asset') || '';
  const [items, setItems] = useState<Transfer[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [holders, setHolders] = useState<Holder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assetFilter, setAssetFilter] = useState(preset);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ asset_id: preset, holder_id: '', department: '', location: '', province: '', note: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, assetRes, holderRes] = await Promise.all([
        fetch('/api/inventory/transfers'),
        fetch('/api/inventory/assets'),
        fetch('/api/inventory/holders'),
      ]);
      const txData = await txRes.json();
      if (!txRes.ok) throw new Error(txData.error || 'Failed to load transfers');
      setItems(Array.isArray(txData) ? txData : []);
      const assetData = await assetRes.json();
      const holderData = await holderRes.json();
      setAssets(Array.isArray(assetData) ? assetData : []);
      setHolders(Array.isArray(holderData) ? holderData : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transfers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = useListQuery({
    items: items as (Transfer & Record<string, unknown>)[],
    searchKeys: ['asset_name', 'from_holder', 'to_holder', 'note'],
    filterKey: assetFilter,
    filterFn: ((row: Transfer) => !assetFilter || row.asset_id === assetFilter) as (
      row: Transfer & Record<string, unknown>
    ) => boolean,
  });

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch('/api/inventory/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, holder_id: form.holder_id || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success('Transfer recorded');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
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
        title="Transfers"
        description="Move an asset to another holder, department, location, or province. The asset record updates and the previous values stay in this history."
        primaryAction={{
          label: 'New transfer',
          onClick: () => {
            setForm({ asset_id: assetFilter || preset, holder_id: '', department: '', location: '', province: '', note: '' });
            setFormError(null);
            setOpen(true);
          },
        }}
        search={list.search}
        onSearchChange={list.setSearch}
        filters={[
          {
            key: 'asset',
            label: 'Asset',
            value: assetFilter,
            onChange: setAssetFilter,
            options: assets.map((asset) => ({ value: asset.id, label: asset.asset_name })),
          },
        ]}
        onResetFilters={() => {
          setAssetFilter('');
          list.reset();
        }}
        columns={[
          { key: 'created_at', header: 'Date', render: (row) => new Date(String(row.created_at)).toLocaleString() },
          { key: 'asset_name', header: 'Asset' },
          { key: 'holder', header: 'Holder', render: (row) => `${row.from_holder} → ${row.to_holder}` },
          { key: 'department', header: 'Department', render: (row) => `${row.from_department} → ${row.to_department}` },
          { key: 'location', header: 'Location', render: (row) => `${row.from_location} → ${row.to_location}` },
          { key: 'province', header: 'Province', render: (row) => `${row.from_province} → ${row.to_province}` },
        ]}
        rows={list.rows}
        rowKey={(row) => String(row.id)}
        loading={loading}
        emptyMessage="No transfers yet."
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
      />
      <FormDialog
        open={open}
        title="New transfer"
        onClose={() => setOpen(false)}
        maxWidth="xl"
        footer={<FormDialogFooter onCancel={() => setOpen(false)} submitLabel="Save" submitting={saving} formId="transfer-form" />}
      >
        <form
          id="transfer-form"
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
            label="Asset"
            value={form.asset_id}
            onChange={(value) => setForm({ ...form, asset_id: value })}
            options={assets.map((asset) => ({ value: asset.id, label: asset.asset_name }))}
            placeholder="Select asset"
            required
          />
          <Dropdown
            label="New holder"
            value={form.holder_id}
            onChange={(value) => setForm({ ...form, holder_id: value })}
            options={holders.map((row) => ({ value: row.id, label: `${row.first_name} ${row.last_name}`.trim() }))}
            placeholder="Keep current holder"
            clearable
          />
          <InputField label="New department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <InputField label="New location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <InputField label="New province" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
          <div className="sm:col-span-2">
            <TextAreaField label="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} />
          </div>
        </form>
      </FormDialog>
    </>
  );
}
