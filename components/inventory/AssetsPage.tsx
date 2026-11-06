'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Copy, Eye, QrCode, RotateCcw, Trash2 } from 'lucide-react';
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
import { ASSET_STATUSES, DEPRECIATION_METHODS, computeDepreciation } from '@/lib/asset-options';

const money = (value: number | null | undefined, currency?: string) =>
  value == null ? '—' : `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${currency ? ` ${currency}` : ''}`;

const methodLabel = (value: string) => DEPRECIATION_METHODS.find((item) => item.value === value)?.label || 'Straight-line';

type Asset = {
  id: string;
  tag_number: string;
  asset_name: string;
  item_specification: string;
  status: string;
  holder_id: string | null;
  holder_name: string;
  department: string;
  category_id: string | null;
  category_name: string;
  location: string;
  province: string;
  cost: number | null;
  asset_currency: string;
  project_id: string | null;
  quantity: number;
  serial_number: string;
  voucher_number: string;
  invoice_date: string;
  remark: string;
  donar: string;
  useful_life_years: number | null;
  salvage_value: number | null;
  depreciation_method: string;
  depreciable: boolean;
  annual_depreciation: number;
  accumulated_depreciation: number;
  book_value: number;
  fully_depreciated: boolean;
  years_elapsed: number;
};

type Option = { id: string; name?: string; description?: string; project_title?: string; first_name?: string; last_name?: string };

const blank = {
  tag_number: '',
  asset_name: '',
  item_specification: '',
  status: 'New',
  holder_id: '',
  department: '',
  category_id: '',
  location: '',
  province: '',
  cost: '',
  asset_currency: 'AFN',
  project_id: '',
  quantity: '1',
  serial_number: '',
  voucher_number: '',
  invoice_date: '',
  remark: '',
  donar: '',
  useful_life_years: '',
  salvage_value: '',
  depreciation_method: 'straight_line',
};

export default function AssetsPage({ trash = false }: { trash?: boolean }) {
  const [items, setItems] = useState<Asset[]>([]);
  const [holders, setHolders] = useState<Option[]>([]);
  const [projects, setProjects] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [holderFilter, setHolderFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Asset | null>(null);
  const [qrAsset, setQrAsset] = useState<Asset | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; label: string; run: () => Promise<void> } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const holder = new URLSearchParams(window.location.search).get('holder');
    if (holder) setHolderFilter(holder);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [assetRes, holderRes, projectRes, categoryRes] = await Promise.all([
        fetch(`/api/inventory/assets?trash=${trash ? '1' : '0'}`),
        fetch('/api/inventory/holders'),
        fetch('/api/inventory/projects'),
        fetch('/api/inventory/categories'),
      ]);
      const assetData = await assetRes.json();
      if (!assetRes.ok) throw new Error(assetData.error || 'Failed to load assets');
      setItems(Array.isArray(assetData) ? assetData : []);
      setHolders(await holderRes.json().catch(() => []));
      setProjects(await projectRes.json().catch(() => []));
      setCategories(await categoryRes.json().catch(() => []));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, [trash]);

  useEffect(() => {
    load();
  }, [load]);

  const list = useListQuery({
    items: items as (Asset & Record<string, unknown>)[],
    searchKeys: ['asset_name', 'tag_number', 'holder_name', 'serial_number', 'location'],
    filterKey: `${status}|${holderFilter}`,
    filterFn: ((row: Asset) => (!status || row.status === status) && (!holderFilter || row.holder_id === holderFilter)) as (
      row: Asset & Record<string, unknown>
    ) => boolean,
  });

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(editing ? `/api/inventory/assets/${editing.id}` : '/api/inventory/assets', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          holder_id: form.holder_id || null,
          category_id: form.category_id || null,
          project_id: form.project_id || null,
          cost: form.cost === '' ? null : Number(form.cost),
          quantity: Number(form.quantity) || 1,
          useful_life_years: form.useful_life_years === '' ? null : Number(form.useful_life_years),
          salvage_value: form.salvage_value === '' ? null : Number(form.salvage_value),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success(editing ? 'Asset updated' : 'Asset created');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (asset: Asset) => {
    setEditing(asset);
    setForm({
      tag_number: asset.tag_number,
      asset_name: asset.asset_name,
      item_specification: asset.item_specification,
      status: asset.status,
      holder_id: asset.holder_id ?? '',
      department: asset.department,
      category_id: asset.category_id ?? '',
      location: asset.location,
      province: asset.province,
      cost: asset.cost == null ? '' : String(asset.cost),
      asset_currency: asset.asset_currency || 'AFN',
      project_id: asset.project_id ?? '',
      quantity: String(asset.quantity || 1),
      serial_number: asset.serial_number,
      voucher_number: asset.voucher_number,
      invoice_date: asset.invoice_date,
      remark: asset.remark,
      donar: asset.donar,
      useful_life_years: asset.useful_life_years == null ? '' : String(asset.useful_life_years),
      salvage_value: asset.salvage_value == null ? '' : String(asset.salvage_value),
      depreciation_method: asset.depreciation_method || 'straight_line',
    });
    setFormError(null);
    setOpen(true);
  };

  const preview = useMemo(
    () =>
      computeDepreciation({
        cost: form.cost === '' ? null : Number(form.cost),
        quantity: Number(form.quantity) || 1,
        invoice_date: form.invoice_date,
        useful_life_years: form.useful_life_years === '' ? null : Number(form.useful_life_years),
        salvage_value: form.salvage_value === '' ? null : Number(form.salvage_value),
        depreciation_method: form.depreciation_method,
      }),
    [form.cost, form.quantity, form.invoice_date, form.useful_life_years, form.salvage_value, form.depreciation_method]
  );

  const copyTag = async (asset: Asset) => {
    const tag = asset.tag_number || asset.asset_name;
    try {
      await navigator.clipboard.writeText(tag);
      toast.success('Tag copied');
    } catch {
      toast.error('Could not copy the tag');
    }
  };

  const ask = (title: string, message: string, label: string, run: () => Promise<void>) => {
    setConfirm({ title, message, label, run });
  };

  const patch = async (id: string, action: 'restore' | 'purge') => {
    const res = await fetch(`/api/inventory/assets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || 'Request failed');
      return;
    }
    toast.success(action === 'restore' ? 'Asset restored' : 'Asset deleted');
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
        title={trash ? 'Asset Trash' : 'Assets'}
        description={
          trash
            ? 'Deleted assets stay here until you restore them or remove them for good.'
            : 'Registered fixed assets with a tag, holder, category, project, and status. Delete moves an asset to trash.'
        }
        primaryAction={
          trash
            ? undefined
            : {
                label: 'New asset',
                onClick: () => {
                  setEditing(null);
                  setForm(blank);
                  setFormError(null);
                  setOpen(true);
                },
              }
        }
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search name, tag, holder, or serial…"
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: status,
            onChange: setStatus,
            options: ASSET_STATUSES.map((item) => ({ value: item, label: item })),
          },
          {
            key: 'holder',
            label: 'Holder',
            value: holderFilter,
            onChange: setHolderFilter,
            options: holders.map((row) => ({
              value: row.id,
              label: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || 'Holder',
            })),
          },
        ]}
        onResetFilters={() => {
          setStatus('');
          setHolderFilter('');
          list.reset();
        }}
        columns={[
          { key: 'tag_number', header: 'Tag', render: (row) => row.tag_number || '—' },
          { key: 'asset_name', header: 'Asset' },
          { key: 'holder_name', header: 'Holder', render: (row) => row.holder_name || '—' },
          { key: 'department', header: 'Department', render: (row) => row.department || '—' },
          { key: 'location', header: 'Location', render: (row) => row.location || '—' },
          { key: 'donar', header: 'Program / Donor', render: (row) => row.donar || '—' },
          { key: 'quantity', header: 'Qty' },
          { key: 'status', header: 'Status', render: (row) => <StatusChip label={String(row.status)} tone={row.status === 'Damaged' ? 'gold' : 'green'} /> },
          { key: 'category_name', header: 'Category', render: (row) => row.category_name || '—' },
          {
            key: 'cost',
            header: 'Cost',
            align: 'right',
            render: (row) => (row.cost == null ? '—' : money(Number(row.cost) * (Number(row.quantity) || 1), String(row.asset_currency || ''))),
          },
          {
            key: 'annual_depreciation',
            header: 'Annual depreciation',
            align: 'right',
            render: (row) => (row.depreciable ? money(Number(row.annual_depreciation)) : '—'),
          },
          {
            key: 'accumulated_depreciation',
            header: 'Accumulated',
            align: 'right',
            render: (row) => (row.depreciable ? money(Number(row.accumulated_depreciation)) : '—'),
          },
          {
            key: 'book_value',
            header: 'Book value',
            align: 'right',
            render: (row) =>
              row.depreciable ? (
                <span className="inline-flex items-center justify-end gap-2">
                  {money(Number(row.book_value))}
                  {row.fully_depreciated ? <StatusChip label="Fully depreciated" tone="gray" /> : null}
                </span>
              ) : (
                '—'
              ),
          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) => {
              const asset = row as Asset;
              if (trash) {
                return (
                  <div className="flex justify-end">
                    <RowActions
                      items={[
                        { key: 'view', label: 'Details', icon: <Eye size={16} />, onClick: () => setViewing(asset) },
                        { key: 'restore', label: 'Restore', icon: <RotateCcw size={16} />, onClick: () => patch(asset.id, 'restore') },
                      ]}
                      overflow={[
                        {
                          key: 'purge',
                          label: 'Delete forever',
                          icon: <Trash2 size={16} />,
                          danger: true,
                          onClick: () =>
                            ask('Delete forever', `Permanently delete ${asset.asset_name}?`, 'Delete forever', () => patch(asset.id, 'purge')),
                        },
                      ]}
                    />
                  </div>
                );
              }
              return (
                <div className="flex justify-end">
                  <RowActions
                    items={[
                      { key: 'copy', label: 'Copy tag', icon: <Copy size={16} />, onClick: () => copyTag(asset) },
                      { key: 'view', label: 'Details', icon: <Eye size={16} />, onClick: () => setViewing(asset) },
                    ]}
                    onEdit={() => startEdit(asset)}
                    overflow={[
                      { key: 'qr', label: 'Download QR code', icon: <QrCode size={16} />, onClick: () => setQrAsset(asset) },
                      {
                        key: 'history',
                        label: 'Transfer history',
                        icon: <ArrowLeftRight size={16} />,
                        onClick: () => router.push(`/inventory/transfers?asset=${asset.id}`),
                      },
                      {
                        key: 'delete',
                        label: 'Delete',
                        icon: <Trash2 size={16} />,
                        danger: true,
                        onClick: () =>
                          ask('Move to trash', `Move ${asset.asset_name} to trash?`, 'Move to trash', async () => {
                            const res = await fetch(`/api/inventory/assets/${asset.id}`, { method: 'DELETE' });
                            const data = await res.json().catch(() => ({}));
                            if (!res.ok) throw new Error(data.error || 'Delete failed');
                            toast.success('Moved to trash');
                            await load();
                          }),
                      },
                    ]}
                  />
                </div>
              );
            },
          },
        ]}
        rows={list.rows}
        rowKey={(row) => String(row.id)}
        loading={loading}
        emptyMessage={trash ? 'Trash is empty.' : 'No assets yet.'}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
      />
      <FormDialog
        open={open}
        title={editing ? 'Edit asset' : 'New asset'}
        onClose={() => setOpen(false)}
        maxWidth="2xl"
        footer={<FormDialogFooter onCancel={() => setOpen(false)} submitLabel="Save" submitting={saving} formId="asset-form" />}
      >
        <form
          id="asset-form"
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
          <InputField label="Asset name" value={form.asset_name} onChange={(e) => setForm({ ...form, asset_name: e.target.value })} required />
          <InputField label="Tag number" value={form.tag_number} onChange={(e) => setForm({ ...form, tag_number: e.target.value })} />
          <Dropdown label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value })} options={ASSET_STATUSES.map((item) => ({ value: item, label: item }))} />
          <Dropdown label="Holder" value={form.holder_id} onChange={(value) => setForm({ ...form, holder_id: value })} options={holders.map((row) => ({ value: row.id, label: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() }))} placeholder="Select holder" clearable />
          <Dropdown label="Category" value={form.category_id} onChange={(value) => setForm({ ...form, category_id: value })} options={categories.map((row) => ({ value: row.id, label: row.name || '' }))} placeholder="Select category" clearable />
          <Dropdown label="Project" value={form.project_id} onChange={(value) => setForm({ ...form, project_id: value })} options={projects.map((row) => ({ value: row.id, label: row.project_title || '' }))} placeholder="Select project" clearable />
          <InputField label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <InputField label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <InputField label="Province" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
          <InputField label="Quantity" type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <InputField label="Cost" type="number" min={0} value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          <InputField label="Currency" value={form.asset_currency} onChange={(e) => setForm({ ...form, asset_currency: e.target.value })} />
          <InputField label="Serial number" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
          <InputField label="Voucher number" value={form.voucher_number} onChange={(e) => setForm({ ...form, voucher_number: e.target.value })} />
          <InputField label="Invoice date" type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} />
          <InputField label="Donor" value={form.donar} onChange={(e) => setForm({ ...form, donar: e.target.value })} />
          <div className="sm:col-span-2 mt-2 border-t border-border pt-3">
            <h3 className="text-sm font-semibold text-foreground">Depreciation</h3>
            <p className="text-xs text-muted-foreground">
              Needs cost, invoice date, and useful life. Cost and salvage value are per unit.
            </p>
          </div>
          <Dropdown
            label="Method"
            value={form.depreciation_method}
            onChange={(value) => setForm({ ...form, depreciation_method: value || 'straight_line' })}
            options={DEPRECIATION_METHODS.map((item) => ({ value: item.value, label: item.label }))}
          />
          <InputField
            label="Useful life (years)"
            type="number"
            min={1}
            max={100}
            step="0.5"
            value={form.useful_life_years}
            onChange={(e) => setForm({ ...form, useful_life_years: e.target.value })}
          />
          <InputField
            label="Salvage value"
            type="number"
            min={0}
            step="0.01"
            value={form.salvage_value}
            onChange={(e) => setForm({ ...form, salvage_value: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs sm:col-span-2">
            <div>
              <div className="text-muted-foreground">Annual</div>
              <div className="text-sm font-semibold">{preview.depreciable ? money(preview.annual_depreciation) : '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Accumulated today</div>
              <div className="text-sm font-semibold">{preview.depreciable ? money(preview.accumulated_depreciation) : '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Book value today</div>
              <div className="text-sm font-semibold">{preview.depreciable ? money(preview.book_value) : '—'}</div>
            </div>
          </div>
          <div className="sm:col-span-2">
            <TextAreaField label="Specification" value={form.item_specification} onChange={(e) => setForm({ ...form, item_specification: e.target.value })} rows={2} />
          </div>
          <div className="sm:col-span-2">
            <TextAreaField label="Remark" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} rows={2} />
          </div>
        </form>
      </FormDialog>
      <DetailDialog
        open={Boolean(viewing)}
        title={viewing ? viewing.asset_name : 'Asset'}
        onClose={() => setViewing(null)}
        rows={
          viewing
            ? [
                { label: 'Tag', value: viewing.tag_number },
                { label: 'Status', value: viewing.status },
                { label: 'Holder', value: viewing.holder_name },
                { label: 'Category', value: viewing.category_name },
                { label: 'Department', value: viewing.department },
                { label: 'Location', value: viewing.location },
                { label: 'Province', value: viewing.province },
                { label: 'Quantity', value: String(viewing.quantity || 1) },
                { label: 'Cost', value: viewing.cost == null ? '' : `${viewing.cost} ${viewing.asset_currency || ''}`.trim() },
                { label: 'Serial number', value: viewing.serial_number },
                { label: 'Voucher', value: viewing.voucher_number },
                { label: 'Invoice date', value: viewing.invoice_date },
                { label: 'Donor', value: viewing.donar },
                { label: 'Depreciation method', value: methodLabel(viewing.depreciation_method) },
                { label: 'Useful life', value: viewing.useful_life_years == null ? '' : `${viewing.useful_life_years} years` },
                { label: 'Salvage value (per unit)', value: viewing.salvage_value == null ? '' : money(viewing.salvage_value, viewing.asset_currency) },
                { label: 'Years in use', value: viewing.depreciable ? String(viewing.years_elapsed) : '' },
                { label: 'Annual depreciation', value: viewing.depreciable ? money(viewing.annual_depreciation, viewing.asset_currency) : '' },
                { label: 'Accumulated depreciation', value: viewing.depreciable ? money(viewing.accumulated_depreciation, viewing.asset_currency) : '' },
                {
                  label: 'Book value',
                  value: viewing.depreciable
                    ? `${money(viewing.book_value, viewing.asset_currency)}${viewing.fully_depreciated ? ' (fully depreciated)' : ''}`
                    : '',
                },
                { label: 'Specification', value: viewing.item_specification },
                { label: 'Remark', value: viewing.remark },
              ]
            : []
        }
      />
      <FormDialog
        open={Boolean(qrAsset)}
        title="QR code"
        onClose={() => setQrAsset(null)}
        footer={
          <PortButton type="button" variant="ghost" onClick={() => setQrAsset(null)}>
            Close
          </PortButton>
        }
      >
        <p className="mb-1 text-sm font-medium">{qrAsset?.asset_name}</p>
        <p className="mb-3 font-mono text-sm text-muted-foreground">{qrAsset?.tag_number || 'This asset has no tag yet.'}</p>
        {qrAsset?.tag_number ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={`QR code for ${qrAsset.tag_number}`}
            className="h-48 w-48 rounded-xl border border-border bg-white p-2"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrAsset.tag_number)}`}
          />
        ) : null}
      </FormDialog>
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title || 'Confirm'}
        message={confirm?.message || ''}
        confirmLabel={confirm?.label || 'Confirm'}
        submitting={confirming}
        onClose={() => {
          if (!confirming) setConfirm(null);
        }}
        onConfirm={async () => {
          if (!confirm) return;
          setConfirming(true);
          try {
            await confirm.run();
            setConfirm(null);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Request failed');
          } finally {
            setConfirming(false);
          }
        }}
      />
    </>
  );
}
