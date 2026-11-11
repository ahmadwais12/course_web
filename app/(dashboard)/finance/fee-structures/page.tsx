'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dropdown,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  StatCard,
  StatusChip,
  TextAreaField,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { dateLabel, money } from '@/lib/display';

type FeeStructureRow = {
  id: string;
  name: string;
  feeTypeId: string | null;
  feeType: string;
  feeTypeCategory: string;
  programName: string | null;
  className: string | null;
  academicYear: string | null;
  amount: number;
  currency: string;
  frequency: string;
  frequencyLabel: string;
  dueDay: number | null;
  lateFee: number;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  isActive: boolean;
};

type Option = { value: string; label: string };

type FormState = {
  name: string;
  feeTypeId: string;
  amount: string;
  frequency: string;
  dueDay: string;
  currency: string;
  programId: string;
  classId: string;
  academicYearId: string;
  effectiveFrom: string;
  effectiveUntil: string;
  description: string;
  status: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  feeTypeId: '',
  amount: '',
  frequency: 'monthly',
  dueDay: '1',
  currency: 'AFN',
  programId: '',
  classId: '',
  academicYearId: '',
  effectiveFrom: '',
  effectiveUntil: '',
  description: '',
  status: 'active',
};

const FREQUENCY_OPTIONS: Option[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one_time', label: 'One time' },
];

function monthlyValue(row: FeeStructureRow) {
  if (!row.isActive) return 0;
  if (row.frequency === 'monthly') return row.amount;
  if (row.frequency === 'quarterly') return row.amount / 3;
  if (row.frequency === 'yearly') return row.amount / 12;
  return 0;
}

export default function FeeStructuresPage() {
  const [rows, setRows] = useState<FeeStructureRow[]>([]);
  const [feeTypes, setFeeTypes] = useState<Option[]>([]);
  const [programs, setPrograms] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [years, setYears] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feeType, setFeeType] = useState('');
  const [frequency, setFrequency] = useState('');
  const [activity, setActivity] = useState('');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/fee-structures');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load fee structures');
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setFeeTypes(Array.isArray(data.feeTypes) ? data.feeTypes : []);
      setPrograms(Array.isArray(data.programs) ? data.programs : []);
      setClasses(Array.isArray(data.classes) ? data.classes : []);
      setYears(Array.isArray(data.academicYears) ? data.academicYears : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load fee structures';
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
    (row: FeeStructureRow) =>
      (!feeType || row.feeTypeId === feeType) &&
      (!frequency || row.frequency === frequency) &&
      (!activity || (activity === 'active' ? row.isActive : !row.isActive)),
    [feeType, frequency, activity]
  );

  const list = useListQuery({
    items: rows as (FeeStructureRow & Record<string, unknown>)[],
    searchKeys: ['name', 'feeType', 'programName', 'className', 'academicYear'],
    filterKey: `${feeType}|${frequency}|${activity}`,
    filterFn: filterFn as (row: FeeStructureRow & Record<string, unknown>) => boolean,
  });

  const stats = useMemo(() => {
    const active = rows.filter((row) => row.isActive);
    return {
      total: rows.length,
      active: active.length,
      runRate: active.reduce((sum, row) => sum + monthlyValue(row), 0),
      average: active.length ? active.reduce((sum, row) => sum + row.amount, 0) / active.length : 0,
    };
  }, [rows]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, feeTypeId: feeTypes[0]?.value ?? '' });
    setFormError(null);
    setOpen(true);
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const amount = Number(form.amount);
    if (form.name.trim().length < 2) {
      setFormError('Enter a fee structure name');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Enter an amount greater than zero');
      return;
    }
    const dueDay = form.dueDay ? Number(form.dueDay) : null;
    if (dueDay !== null && (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)) {
      setFormError('Due day must be between 1 and 31');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/finance/fee-structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          feeTypeId: form.feeTypeId || null,
          amount,
          frequency: form.frequency,
          dueDay,
          currency: form.currency,
          programId: form.programId || null,
          classId: form.classId || null,
          academicYearId: form.academicYearId || null,
          effectiveFrom: form.effectiveFrom || null,
          effectiveUntil: form.effectiveUntil || null,
          description: form.description,
          isActive: form.status === 'active',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create fee structure');
      toast.success('Fee structure created');
      setOpen(false);
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create fee structure';
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ListPageShell
        title="Fee Structures"
        description="Fee plans per program, class, and academic year"
        primaryAction={{ label: 'New Fee Structure', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search fee plan, type, program, or class…"
        onResetFilters={() => {
          list.reset();
          setFeeType('');
          setFrequency('');
          setActivity('');
        }}
        filters={[
          {
            key: 'fee_type',
            label: 'Fee type',
            value: feeType,
            options: feeTypes,
            onChange: setFeeType,
          },
          {
            key: 'frequency',
            label: 'Frequency',
            value: frequency,
            options: FREQUENCY_OPTIONS,
            onChange: setFrequency,
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
            header: 'Fee plan',
            render: (row) => (
              <div>
                <div className="font-semibold">{row.name}</div>
                <div className="text-xs text-muted-foreground">{row.feeType}</div>
              </div>
            ),
          },
          {
            key: 'scope',
            header: 'Scope',
            render: (row) => (
              <span className="text-xs text-muted-foreground">
                {[row.programName, row.className, row.academicYear].filter(Boolean).join(' · ') || 'All students'}
              </span>
            ),
          },
          {
            key: 'amount',
            header: 'Amount',
            align: 'right',
            render: (row) => (
              <div>
                <div className="font-semibold">{money(row.amount, row.currency)}</div>
                <div className="text-[11px] capitalize text-muted-foreground">{row.frequencyLabel}</div>
              </div>
            ),
          },
          {
            key: 'dueDay',
            header: 'Due day',
            align: 'right',
            render: (row) => (row.dueDay ? `Day ${row.dueDay}` : '—'),
          },
          {
            key: 'effective',
            header: 'Effective',
            render: (row) => (
              <span className="text-xs text-muted-foreground">
                {dateLabel(row.effectiveFrom)} – {row.effectiveUntil ? dateLabel(row.effectiveUntil) : 'open'}
              </span>
            ),
          },
          {
            key: 'isActive',
            header: 'Status',
            render: (row) => (
              <StatusChip label={row.isActive ? 'active' : 'inactive'} tone={row.isActive ? 'green' : 'gray'} />
            ),
          },
        ]}
        rows={list.rows as FeeStructureRow[]}
        rowKey={(row) => row.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No fee structures yet. Create the first fee plan."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Fee plans" value={stats.total} accent="blue" />
          <StatCard label="Active plans" value={stats.active} accent="green" />
          <StatCard label="Monthly run rate" value={money(stats.runRate)} accent="gold" />
          <StatCard label="Average fee" value={money(stats.average)} accent="purple" />
        </div>
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={open}
        title="New Fee Structure"
        onClose={() => setOpen(false)}
        maxWidth="lg"
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel="Create Fee Structure"
            submitting={saving}
            formId="fee-structure-form"
          />
        }
      >
        <form id="fee-structure-form" onSubmit={submit} className="space-y-4">
          <InputField
            label="Fee structure name"
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g. Monthly tuition — IELTS Morning Batch"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Dropdown
              label="Fee type"
              value={form.feeTypeId}
              onChange={(value) => update('feeTypeId', value)}
              options={feeTypes}
              placeholder="Select fee type"
              clearable
            />
            <Dropdown
              label="Frequency"
              value={form.frequency}
              onChange={(value) => update('frequency', value)}
              options={FREQUENCY_OPTIONS}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <InputField
              label="Amount"
              required
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => update('amount', e.target.value)}
            />
            <InputField
              label="Currency"
              value={form.currency}
              onChange={(e) => update('currency', e.target.value.toUpperCase())}
            />
            <InputField
              label="Due day"
              type="number"
              min="1"
              max="31"
              value={form.dueDay}
              onChange={(e) => update('dueDay', e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Dropdown
              label="Program"
              value={form.programId}
              onChange={(value) => update('programId', value)}
              options={programs}
              placeholder="All programs"
              clearable
            />
            <Dropdown
              label="Class"
              value={form.classId}
              onChange={(value) => update('classId', value)}
              options={classes}
              placeholder="All classes"
              clearable
            />
            <Dropdown
              label="Academic year"
              value={form.academicYearId}
              onChange={(value) => update('academicYearId', value)}
              options={years}
              placeholder="Any year"
              clearable
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Effective from"
              type="date"
              value={form.effectiveFrom}
              onChange={(e) => update('effectiveFrom', e.target.value)}
            />
            <InputField
              label="Effective until"
              type="date"
              value={form.effectiveUntil}
              onChange={(e) => update('effectiveUntil', e.target.value)}
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
            placeholder="What this fee covers"
          />
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>
    </>
  );
}
