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
import { PauseCircle, PlayCircle, Trash2 } from 'lucide-react';

type AccountRow = {
  id: string;
  code: string | null;
  name: string;
  type: string;
  normalBalance: string;
  description: string | null;
  isActive: boolean;
  parentId: string | null;
  displayOrder: number;
};

type Summary = {
  accounts: number;
  assets: number;
  liabilities: number;
  income: number;
  expenses: number;
};

type FormState = {
  accountCode: string;
  name: string;
  type: string;
  normalBalance: string;
  parentId: string;
  description: string;
  displayOrder: string;
  status: string;
};

const TYPE_OPTIONS = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Equity' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
];

const TYPE_TONE: Record<string, 'green' | 'gold' | 'purple' | 'blue' | 'gray'> = {
  asset: 'green',
  liability: 'purple',
  equity: 'blue',
  income: 'gold',
  expense: 'gray',
};

const EMPTY_FORM: FormState = {
  accountCode: '',
  name: '',
  type: 'asset',
  normalBalance: 'debit',
  parentId: '',
  description: '',
  displayOrder: '0',
  status: 'active',
};

export default function ChartOfAccountsPage() {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState('');
  const [activity, setActivity] = useState('');

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [deleting, setDeleting] = useState<AccountRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/chart-of-accounts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load chart of accounts');
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setSummary(data.summary ?? null);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load chart of accounts';
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

  const filterFn = useCallback(
    (row: AccountRow) =>
      (!type || row.type === type) &&
      (!activity || (activity === 'active' ? row.isActive : !row.isActive)),
    [type, activity]
  );

  const list = useListQuery({
    items: rows as (AccountRow & Record<string, unknown>)[],
    searchKeys: ['code', 'name', 'type', 'description'],
    filterKey: `${type}|${activity}`,
    filterFn: filterFn as (row: AccountRow & Record<string, unknown>) => boolean,
  });

  const parentOptions = useMemo(
    () => rows.map((row) => ({ value: row.id, label: `${row.code ? `${row.code} · ` : ''}${row.name}` })),
    [rows]
  );
  const parentById = useMemo(() => new Map(rows.map((row) => [row.id, row.name])), [rows]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (row: AccountRow) => {
    setEditing(row);
    setForm({
      accountCode: row.code ?? '',
      name: row.name,
      type: row.type,
      normalBalance: row.normalBalance,
      parentId: row.parentId ?? '',
      description: row.description ?? '',
      displayOrder: String(row.displayOrder),
      status: row.isActive ? 'active' : 'inactive',
    });
    setFormError(null);
    setOpen(true);
  };

  const toggleActive = async (row: AccountRow) => {
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/finance/chart-of-accounts/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update account');
      toast.success(row.isActive ? 'Account deactivated' : 'Account activated');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update account');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/finance/chart-of-accounts/${deleting.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');
      toast.success('Account deleted');
      setDeleting(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete account');
    } finally {
      setSaving(false);
    }
  };

  const changeType = (value: string) => {
    setForm((prev) => ({
      ...prev,
      type: value,
      normalBalance: value === 'asset' || value === 'expense' ? 'debit' : 'credit',
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Enter an account name');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        editing ? `/api/finance/chart-of-accounts/${editing.id}` : '/api/finance/chart-of-accounts',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountCode: form.accountCode,
            name: form.name.trim(),
            type: form.type,
            normalBalance: form.normalBalance,
            parentId: form.parentId || null,
            description: form.description,
            displayOrder: Number(form.displayOrder) || 0,
            isActive: form.status === 'active',
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save account');
      toast.success(editing ? 'Account updated' : 'Account created');
      setOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save account';
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ListPageShell
        title="Chart of Accounts"
        description="Assets, liabilities, equity, income, and expense accounts"
        primaryAction={{ label: 'New Account', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search account name or code…"
        onResetFilters={() => {
          list.reset();
          setType('');
          setActivity('');
        }}
        filters={[
          {
            key: 'type',
            label: 'Account type',
            value: type,
            options: TYPE_OPTIONS,
            onChange: setType,
          },
          {
            key: 'activity',
            label: 'Status',
            value: activity,
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ],
            onChange: setActivity,
          },
        ]}
        loading={loading}
        columns={[
          {
            key: 'name',
            header: 'Account',
            render: (row) => (
              <div>
                <div className="font-semibold">
                  {row.code ? `${row.code} · ` : ''}
                  {row.name}
                </div>
                {row.description && (
                  <div className="max-w-[280px] truncate text-xs text-muted-foreground">{row.description}</div>
                )}
              </div>
            ),
          },
          {
            key: 'type',
            header: 'Type',
            render: (row) => <StatusChip label={row.type} tone={TYPE_TONE[row.type] ?? 'blue'} />,
          },
          {
            key: 'normalBalance',
            header: 'Normal balance',
            render: (row) => <span className="capitalize">{row.normalBalance}</span>,
          },
          {
            key: 'parent',
            header: 'Parent',
            render: (row) =>
              row.parentId ? parentById.get(row.parentId) ?? '—' : <span className="text-xs text-muted-foreground">—</span>,
          },
          {
            key: 'displayOrder',
            header: 'Order',
            align: 'right',
            render: (row) => row.displayOrder,
          },
          {
            key: 'isActive',
            header: 'Status',
            render: (row) => (
              <StatusChip label={row.isActive ? 'active' : 'inactive'} tone={row.isActive ? 'green' : 'gray'} />
            ),
          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) => (
              <RowActions
                onEdit={() => openEdit(row)}
                overflow={[
                  {
                    key: 'toggle',
                    label: row.isActive ? 'Deactivate' : 'Activate',
                    icon: row.isActive ? <PauseCircle size={16} /> : <PlayCircle size={16} />,
                    onClick: () => void toggleActive(row),
                    disabled: busyId === row.id,
                  },
                  {
                    key: 'delete',
                    label: 'Delete',
                    icon: <Trash2 size={16} />,
                    onClick: () => setDeleting(row),
                    danger: true,
                  },
                ]}
              />
            ),
          },
        ]}
        rows={list.rows as AccountRow[]}
        rowKey={(row) => row.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No accounts yet. Create the first account to build your chart of accounts."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Accounts" value={summary?.accounts ?? 0} accent="blue" />
          <StatCard label="Assets" value={summary?.assets ?? 0} accent="green" />
          <StatCard label="Liabilities" value={summary?.liabilities ?? 0} accent="purple" />
          <StatCard
            label="Income / expense"
            value={`${summary?.income ?? 0} / ${summary?.expenses ?? 0}`}
            accent="gold"
          />
        </div>
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={open}
        title={editing ? 'Edit Account' : 'New Account'}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        maxWidth="lg"
        footer={
          <FormDialogFooter
            onCancel={() => {
              setOpen(false);
              setEditing(null);
            }}
            submitLabel={editing ? 'Save Changes' : 'Create Account'}
            submitting={saving}
            formId="account-form"
          />
        }
      >
        <form id="account-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Account code"
              value={form.accountCode}
              onChange={(e) => update('accountCode', e.target.value)}
              placeholder="e.g. 1000"
            />
            <InputField
              label="Account name"
              required
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Cash on hand"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Dropdown
              label="Account type"
              value={form.type}
              onChange={changeType}
              options={TYPE_OPTIONS}
              required
            />
            <Dropdown
              label="Normal balance"
              value={form.normalBalance}
              onChange={(value) => update('normalBalance', value)}
              options={[
                { value: 'debit', label: 'Debit' },
                { value: 'credit', label: 'Credit' },
              ]}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Dropdown
              label="Parent account"
              value={form.parentId}
              onChange={(value) => update('parentId', value)}
              options={parentOptions}
              placeholder="Top-level account"
              clearable
            />
            <InputField
              label="Display order"
              type="number"
              value={form.displayOrder}
              onChange={(e) => update('displayOrder', e.target.value)}
            />
          </div>
          <Dropdown
            label="Status"
            value={form.status}
            onChange={(value) => update('status', value)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
          <TextAreaField
            label="Description"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="What this account is used for"
          />
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete account"
        message={`Delete “${deleting?.name ?? 'this account'}”? Accounts used by transactions cannot be removed.`}
        submitting={saving}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
