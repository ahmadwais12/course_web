'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Download, Eye } from 'lucide-react';
import {
  ConfirmDialog,
  DetailDialog,
  Dropdown,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  PhoneField,
  PhoneText,
  PortButton,
  PriceField,
  PriceText,
  RowActions,
  StatusChip,
  TextAreaField,
  statusToneFromValue,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { downloadCsv } from '@/lib/csv';
import { timestampLabel } from '@/lib/display';
import { normalizePhone, parseAmount } from '@/lib/format';
import { REGISTERS, type RegisterField } from '@/lib/inventory-registers';

type ListRow = Record<string, unknown> & { id: string };

const today = () => new Date().toISOString().slice(0, 10);

const titleCase = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export default function RegisterPage({ register }: { register: string }) {
  const config = REGISTERS[register];
  const [rows, setRows] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ListRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ListRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ListRow | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const blank = useCallback(() => {
    const draft: Record<string, string> = {};
    for (const field of config.fields) {
      draft[field.key] = field.type === 'date' ? today() : '';
    }
    return draft;
  }, [config]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/ops/${config.resource}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to load ${config.title.toLowerCase()}`);
      setRows(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to load ${config.title.toLowerCase()}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    load();
  }, [load]);

  const list = useListQuery({
    items: rows,
    searchKeys: config.fields.map((field) => field.key) as (keyof ListRow)[],
    filterKey: config.resource,
  });

  const startCreate = () => {
    setEditing(null);
    setForm(blank());
    setFormError(null);
    setOpen(true);
  };

  const startEdit = (row: ListRow) => {
    setEditing(row);
    const draft: Record<string, string> = {};
    for (const field of config.fields) {
      draft[field.key] = String(row[field.key] ?? '');
    }
    setForm(draft);
    setFormError(null);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const field of config.fields) {
        const value = (form[field.key] ?? '').trim();
        payload[field.key] =
          field.type === 'number'
            ? value === ''
              ? null
              : Number(value)
            : field.type === 'price'
              ? parseAmount(value)
              : field.type === 'tel'
                ? normalizePhone(value)
                : value;
      }
      const res = await fetch(
        editing
          ? `/api/inventory/ops/${config.resource}/${editing.id}`
          : `/api/inventory/ops/${config.resource}`,
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success(editing ? 'Record updated' : 'Record created');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: ListRow) => {
    const res = await fetch(`/api/inventory/ops/${config.resource}/${row.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || 'Delete failed');
      return;
    }
    toast.success('Record deleted');
    await load();
  };

  const exportCsv = () => {
    downloadCsv(
      `${config.resource}-${today()}`,
      list.filtered,
      [
        ...config.columns.map((column) => ({
          header: column.header,
          value: (row: ListRow) => {
            const value = row[column.key];
            return value == null ? '' : String(value);
          },
        })),
        {
          header: 'Created at',
          value: (row: ListRow) => timestampLabel(row.created_at as string | undefined),
        },
      ]
    );
  };

  const renderField = (field: RegisterField) => {
    const value = form[field.key] ?? '';
    const onChange = (next: string) => setForm((current) => ({ ...current, [field.key]: next }));

    if (field.type === 'price') {
      return (
        <PriceField
          key={field.key}
          label={field.label}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder}
          hint={field.hint}
          required={field.required}
        />
      );
    }
    if (field.type === 'tel') {
      return (
        <PhoneField
          key={field.key}
          label={field.label}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder ?? '+93 70 000 0000'}
          hint={field.hint}
          required={field.required}
        />
      );
    }
    if (field.type === 'select') {
      return (
        <Dropdown
          key={field.key}
          label={field.label}
          value={value}
          onChange={onChange}
          options={field.options ?? []}
          placeholder={`Select ${field.label.toLowerCase()}`}
          required={field.required}
          clearable={!field.required}
        />
      );
    }
    if (field.type === 'textarea') {
      return (
        <div key={field.key} className="sm:col-span-2">
          <TextAreaField
            label={field.label}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            required={field.required}
          />
        </div>
      );
    }
    return (
      <InputField
        key={field.key}
        label={field.label}
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        hint={field.hint}
        required={field.required}
        min={field.min}
        step={field.step}
      />
    );
  };

  return (
    <>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <ListPageShell
        title={config.title}
        description={config.description}
        primaryAction={{ label: 'New record', onClick: startCreate }}
        secondaryActions={
          <PortButton onClick={exportCsv} disabled={loading || list.total === 0}>
            <Download size={16} /> CSV
          </PortButton>
        }
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder={`Search ${config.title.toLowerCase()}…`}
        onResetFilters={() => list.reset()}
        columns={[
          ...config.columns.map((column) => ({
            key: column.key,
            header: column.header,
            align:
              column.format === 'money' || column.format === 'price' || column.format === 'number'
                ? ('right' as const)
                : ('left' as const),
            render: (row: ListRow) => {
              const value = row[column.key];
              if (value == null || value === '') return '—';
              if (column.format === 'badge') {
                return (
                  <StatusChip
                    tone={statusToneFromValue(String(value))}
                    label={titleCase(String(value))}
                  />
                );
              }
              if (column.format === 'money' || column.format === 'price') {
                return <PriceText value={value} />;
              }
              if (column.format === 'phone') return <PhoneText value={value} link />;
              return String(value);
            },
          })),
          {
            key: 'created_at',
            header: 'Created at',
            render: (row: ListRow) => timestampLabel(row.created_at as string | undefined),
          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right' as const,
            render: (row: ListRow) => (
              <div className="flex justify-end">
                <RowActions
                  items={[
                    {
                      key: 'view',
                      label: 'Details',
                      icon: <Eye className="h-4 w-4" />,
                      onClick: () => setViewing(row),
                    },
                  ]}
                  onEdit={() => startEdit(row)}
                  onDelete={() => setPendingDelete(row)}
                />
              </div>
            ),
          },
        ]}
        rows={list.rows}
        rowKey={(row) => String(row.id)}
        loading={loading}
        emptyMessage={`No ${config.title.toLowerCase()} records yet.`}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
      />

      <FormDialog
        open={open}
        title={editing ? `Edit ${config.title.replace(/s$/, '')}` : `New ${config.title.replace(/s$/, '')}`}
        onClose={() => setOpen(false)}
        maxWidth="xl"
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel="Save"
            submitting={saving}
            formId={`register-${config.resource}-form`}
          />
        }
      >
        <form
          id={`register-${config.resource}-form`}
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
          {config.fields.map(renderField)}
        </form>
      </FormDialog>

      <DetailDialog
        open={Boolean(viewing)}
        title={viewing ? String(viewing[config.primary.key] ?? config.title) : config.title}
        onClose={() => setViewing(null)}
        rows={
          viewing
            ? config.fields.map((field) => ({
                label: field.label,
                value:
                  viewing[field.key] == null || viewing[field.key] === ''
                    ? '—'
                    : field.type === 'select'
                      ? titleCase(String(viewing[field.key]))
                      : String(viewing[field.key]),
              }))
            : []
        }
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete record"
        message={
          pendingDelete
            ? `Delete ${String(pendingDelete[config.primary.key] ?? 'this record')}?`
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
