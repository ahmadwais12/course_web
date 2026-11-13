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
  statusToneFromValue,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { CheckCircle2, RotateCcw, Trash2, Wallet } from 'lucide-react';
import { dateLabel, money } from '@/lib/display';

type ExpenseRow = {
  id: string;
  category: string;
  subcategory: string | null;
  amount: number;
  expenseDate: string | null;
  description: string | null;
  vendor: string | null;
  invoiceNumber: string | null;
  status: string;
  paymentMethod: string | null;
  notes: string | null;
};

type FormState = {
  category: string;
  amount: string;
  expenseDate: string;
  vendor: string;
  description: string;
  paymentMethod: string;
  invoiceNumber: string;
  status: string;
};

const STANDARD_CATEGORIES = [
  'Supplies',
  'Utilities',
  'Transport',
  'Rent',
  'Maintenance',
  'Marketing',
  'Training',
  'Travel',
  'Other',
];

const METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
];

export default function ExpensesPage() {
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [deleting, setDeleting] = useState<ExpenseRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const blankForm = (): FormState => ({
    category: 'Supplies',
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    vendor: '',
    description: '',
    paymentMethod: '',
    invoiceNumber: '',
    status: 'pending',
  });
  const [form, setForm] = useState<FormState>(blankForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/expenses');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load expenses');
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setCategories(Array.isArray(data.categories) ? data.categories : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load expenses';
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
    (row: ExpenseRow) =>
      (!category || row.category === category) &&
      (!status || row.status === status) &&
      (!method || row.paymentMethod === method),
    [category, status, method]
  );

  const list = useListQuery({
    items: rows as (ExpenseRow & Record<string, unknown>)[],
    searchKeys: ['category', 'subcategory', 'vendor', 'description', 'invoiceNumber'],
    filterKey: `${category}|${status}|${method}`,
    filterFn: filterFn as (row: ExpenseRow & Record<string, unknown>) => boolean,
  });

  const stats = useMemo(
    () => ({
      total: rows.reduce((sum, row) => sum + row.amount, 0),
      pending: rows.filter((row) => row.status === 'pending').length,
      approved: rows.filter((row) => row.status === 'approved').length,
      thisMonth: rows
        .filter((row) => String(row.expenseDate ?? '').slice(0, 7) === new Date().toISOString().slice(0, 7))
        .reduce((sum, row) => sum + row.amount, 0),
    }),
    [rows]
  );

  const categoryOptions = useMemo(
    () =>
      [...new Set([...categories, ...STANDARD_CATEGORIES])]
        .sort()
        .map((value) => ({ value, label: value })),
    [categories]
  );

  const methodOptions = useMemo(() => {
    const set = new Set(rows.map((row) => row.paymentMethod).filter(Boolean) as string[]);
    return [...set].map((value) => ({ value, label: value.replaceAll('_', ' ') }));
  }, [rows]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm());
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (row: ExpenseRow) => {
    setEditing(row);
    setForm({
      category: row.category,
      amount: String(row.amount),
      expenseDate: row.expenseDate ?? '',
      vendor: row.vendor ?? '',
      description: row.description ?? '',
      paymentMethod: row.paymentMethod ?? '',
      invoiceNumber: row.invoiceNumber ?? '',
      status: row.status,
    });
    setFormError(null);
    setOpen(true);
  };

  const changeStatus = async (row: ExpenseRow, status: string) => {
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/finance/expenses/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update expense');
      toast.success(`Expense marked ${status}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update expense');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/finance/expenses/${deleting.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete expense');
      toast.success('Expense deleted');
      setDeleting(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete expense');
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const amount = Number(form.amount);
    if (!form.category.trim()) {
      setFormError('Choose an expense category');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Enter an amount greater than zero');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        editing ? `/api/finance/expenses/${editing.id}` : '/api/finance/expenses',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: form.category.trim(),
            amount,
            expenseDate: form.expenseDate,
            vendor: form.vendor,
            description: form.description,
            paymentMethod: form.paymentMethod || null,
            invoiceNumber: form.invoiceNumber,
            status: editing ? form.status : 'pending',
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save expense');
      toast.success(editing ? 'Expense updated' : 'Expense recorded');
      setOpen(false);
      setEditing(null);
      setForm(blankForm());
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save expense';
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ListPageShell
        title="Expenses"
        description="Institute spending by category, vendor, and approval status"
        primaryAction={{ label: 'Record Expense', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search category, vendor, or invoice…"
        onResetFilters={() => {
          list.reset();
          setCategory('');
          setStatus('');
          setMethod('');
        }}
        filters={[
          {
            key: 'category',
            label: 'Category',
            value: category,
            options: categoryOptions,
            onChange: setCategory,
          },
          {
            key: 'status',
            label: 'Status',
            value: status,
            options: [
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'paid', label: 'Paid' },
              { value: 'rejected', label: 'Rejected' },
            ],
            onChange: setStatus,
          },
          {
            key: 'method',
            label: 'Payment method',
            value: method,
            options: methodOptions,
            onChange: setMethod,
          },
        ]}
        loading={loading}
        columns={[
          {
            key: 'category',
            header: 'Category',
            render: (row) => (
              <div>
                <div className="font-semibold">{row.category}</div>
                {row.subcategory && (
                  <div className="text-xs text-muted-foreground">{row.subcategory}</div>
                )}
              </div>
            ),
          },
          {
            key: 'vendor',
            header: 'Vendor / description',
            render: (row) => (
              <div>
                <div>{row.vendor || '—'}</div>
                <div className="text-xs text-muted-foreground">{row.description || row.invoiceNumber || ''}</div>
              </div>
            ),
          },
          {
            key: 'amount',
            header: 'Amount',
            align: 'right',
            render: (row) => <span className="font-semibold">{money(row.amount)}</span>,
          },
          {
            key: 'expenseDate',
            header: 'Date',
            render: (row) => dateLabel(row.expenseDate),
          },
          {
            key: 'paymentMethod',
            header: 'Method',
            render: (row) => (row.paymentMethod ? row.paymentMethod.replaceAll('_', ' ') : '—'),
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusChip label={row.status} tone={statusToneFromValue(row.status)} />
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
                    key: 'approve',
                    label: 'Approve',
                    icon: <CheckCircle2 size={16} />,
                    onClick: () => void changeStatus(row, 'approved'),
                    disabled: busyId === row.id || row.status !== 'pending',
                  },
                  {
                    key: 'pay',
                    label: 'Mark paid',
                    icon: <Wallet size={16} />,
                    onClick: () => void changeStatus(row, 'paid'),
                    disabled: busyId === row.id || row.status === 'paid',
                  },
                  {
                    key: 'reopen',
                    label: 'Set pending',
                    icon: <RotateCcw size={16} />,
                    onClick: () => void changeStatus(row, 'pending'),
                    disabled: busyId === row.id || row.status === 'pending',
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
        rows={list.rows as ExpenseRow[]}
        rowKey={(row) => row.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No expenses recorded yet."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total expenses" value={money(stats.total)} accent="blue" />
          <StatCard label="This month" value={money(stats.thisMonth)} accent="gold" />
          <StatCard label="Pending approval" value={stats.pending} accent="purple" />
          <StatCard label="Approved" value={stats.approved} accent="green" />
        </div>
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={open}
        title={editing ? 'Edit Expense' : 'Record Expense'}
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
            submitLabel={editing ? 'Save Changes' : 'Record Expense'}
            submitting={saving}
            formId="expense-form"
          />
        }
      >
        <form id="expense-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Dropdown
              label="Category"
              required
              value={form.category}
              onChange={(value) => update('category', value)}
              options={categoryOptions}
            />
            <InputField
              label="Amount"
              required
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => update('amount', e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Expense date"
              type="date"
              value={form.expenseDate}
              onChange={(e) => update('expenseDate', e.target.value)}
            />
            <Dropdown
              label="Payment method"
              value={form.paymentMethod}
              onChange={(value) => update('paymentMethod', value)}
              options={METHOD_OPTIONS}
              placeholder="Not specified"
              clearable
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Vendor"
              value={form.vendor}
              onChange={(e) => update('vendor', e.target.value)}
              placeholder="Vendor or supplier"
            />
            <InputField
              label="Invoice number"
              value={form.invoiceNumber}
              onChange={(e) => update('invoiceNumber', e.target.value)}
            />
          </div>
          <TextAreaField
            label="Description"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="What was purchased"
          />
          {editing && (
            <Dropdown
              label="Status"
              value={form.status}
              onChange={(value) => update('status', value)}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'paid', label: 'Paid' },
                { value: 'rejected', label: 'Rejected' },
              ]}
              required
            />
          )}
          {!editing && (
            <p className="text-xs text-muted-foreground">
              New expenses are recorded as pending until approved.
            </p>
          )}
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete expense"
        message={`Delete the ${deleting ? money(deleting.amount) : ''} ${deleting?.category ?? ''} expense? This cannot be undone.`}
        submitting={saving}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
