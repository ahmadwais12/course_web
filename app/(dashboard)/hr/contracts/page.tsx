'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dropdown,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  RowActions,
  StatCard,
  StatusChip,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { dateLabel, money } from '@/lib/display';

type ExpiryState = 'active' | 'expiring' | 'expired' | 'open';

type ContractRow = {
  id: string;
  kind: 'staff' | 'teacher';
  employeeName: string;
  employeeCode: string | null;
  designation: string;
  department: string | null;
  contractType: string;
  joinDate: string | null;
  contractEndDate: string | null;
  salary: number;
  status: string;
  daysToExpiry: number | null;
  expiryState: ExpiryState;
};

type Summary = { total: number; expiring: number; expired: number; open: number };

const EXPIRY_LABEL: Record<ExpiryState, string> = {
  active: 'active',
  expiring: 'expiring soon',
  expired: 'expired',
  open: 'open-ended',
};

const CONTRACT_TYPES = [
  { value: 'full-time', label: 'Full time' },
  { value: 'part-time', label: 'Part time' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' },
];

const CONTRACT_LABEL = new Map(CONTRACT_TYPES.map((type) => [type.value, type.label]));

const EXPIRY_TONE: Record<ExpiryState, 'green' | 'gold' | 'purple' | 'blue'> = {
  active: 'green',
  expiring: 'gold',
  expired: 'purple',
  open: 'blue',
};

export default function HrContractsPage() {
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiry, setExpiry] = useState('');
  const [contractType, setContractType] = useState('');
  const [kind, setKind] = useState('');

  const [editing, setEditing] = useState<ContractRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    contractType: 'contract',
    contractEndDate: '',
    salary: '',
    status: 'active',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/contracts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load contracts');
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setSummary(data.summary ?? null);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load contracts';
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

  const openEdit = (row: ContractRow) => {
    setEditing(row);
    setForm({
      contractType: row.contractType.toLowerCase().replaceAll('_', '-'),
      contractEndDate: row.contractEndDate ?? '',
      salary: String(row.salary || ''),
      status: row.status,
    });
    setFormError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/hr/contracts/${editing.id}?kind=${editing.kind}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractType: form.contractType,
          contractEndDate: form.contractEndDate || null,
          salary: Number(form.salary) || 0,
          status: form.status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update contract');
      toast.success('Contract updated');
      setEditing(null);
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to update contract';
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const filterFn = useCallback(
    (row: ContractRow) =>
      (!expiry || row.expiryState === expiry) &&
      (!contractType || row.contractType.toLowerCase().replaceAll('_', '-') === contractType) &&
      (!kind || row.kind === kind),
    [expiry, contractType, kind]
  );

  const list = useListQuery({
    items: rows as (ContractRow & Record<string, unknown>)[],
    searchKeys: ['employeeName', 'employeeCode', 'designation', 'department'],
    filterKey: `${expiry}|${contractType}|${kind}`,
    filterFn: filterFn as (row: ContractRow & Record<string, unknown>) => boolean,
  });

  const typeOptions = useMemo(() => {
    const set = new Set(
      rows.map((row) => row.contractType.toLowerCase().replaceAll('_', '-')).filter(Boolean)
    );
    return [...set].map((value) => ({
      value,
      label: CONTRACT_LABEL.get(value) ?? value.replaceAll('-', ' '),
    }));
  }, [rows]);

  return (
    <>
    <ListPageShell
      title="Contracts"
      description="Employment contracts, renewal dates, and expiry risk"
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search employee, code, or department…"
      onResetFilters={() => {
        list.reset();
        setExpiry('');
        setContractType('');
        setKind('');
      }}
      filters={[
        {
          key: 'expiry',
          label: 'Contract state',
          value: expiry,
          options: [
            { value: 'expired', label: 'Expired' },
            { value: 'expiring', label: 'Expiring in 30 days' },
            { value: 'active', label: 'Active' },
            { value: 'open', label: 'Open-ended' },
          ],
          onChange: setExpiry,
        },
        {
          key: 'contract_type',
          label: 'Contract type',
          value: contractType,
          options: typeOptions,
          onChange: setContractType,
        },
        {
          key: 'kind',
          label: 'Employee type',
          value: kind,
          options: [
            { value: 'teacher', label: 'Teachers' },
            { value: 'staff', label: 'Staff' },
          ],
          onChange: setKind,
        },
      ]}
      loading={loading}
      columns={[
        {
          key: 'employeeName',
          header: 'Employee',
          render: (row) => (
            <div>
              <div className="font-semibold">{row.employeeName}</div>
              <div className="text-xs text-muted-foreground">
                {[row.employeeCode, row.kind === 'teacher' ? 'Teacher' : 'Staff']
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
          ),
        },
        { key: 'designation', header: 'Designation' },
        {
          key: 'department',
          header: 'Department',
          render: (row) => row.department || <span className="text-xs text-muted-foreground">—</span>,
        },
        {
          key: 'contractType',
          header: 'Type',
          render: (row) => {
            const key = row.contractType.toLowerCase().replaceAll('_', '-');
            return CONTRACT_LABEL.get(key) ?? row.contractType.replaceAll('-', ' ');
          },
        },
        {
          key: 'joinDate',
          header: 'Started',
          render: (row) => dateLabel(row.joinDate),
        },
        {
          key: 'contractEndDate',
          header: 'Ends',
          render: (row) => dateLabel(row.contractEndDate),
        },
        {
          key: 'expiryState',
          header: 'Expiry',
          render: (row) => (
            <div className="space-y-1">
              <StatusChip label={EXPIRY_LABEL[row.expiryState]} tone={EXPIRY_TONE[row.expiryState]} />
              {row.daysToExpiry !== null && (
                <div className="text-[11px] text-muted-foreground">
                  {row.daysToExpiry < 0
                    ? `${Math.abs(row.daysToExpiry)} days ago`
                    : `${row.daysToExpiry} days left`}
                </div>
              )}
            </div>
          ),
        },
        {
          key: 'salary',
          header: 'Salary',
          align: 'right',
          render: (row) => (row.salary ? money(row.salary) : '—'),
        },
        {
          key: 'actions',
          header: 'Actions',
          align: 'right',
          render: (row) => <RowActions onEdit={() => openEdit(row)} />,
        },
      ]}
      rows={list.rows as ContractRow[]}
      rowKey={(row) => `${row.kind}-${row.id}`}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No contracts recorded yet."
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Contracts" value={summary?.total ?? 0} accent="blue" />
        <StatCard label="Expiring in 30 days" value={summary?.expiring ?? 0} accent="gold" />
        <StatCard label="Expired" value={summary?.expired ?? 0} accent="purple" />
        <StatCard label="Open-ended" value={summary?.open ?? 0} accent="green" />
      </div>
      {error && <ErrorBanner message={error} />}
    </ListPageShell>

    <FormDialog
      open={Boolean(editing)}
      title={`Edit contract — ${editing?.employeeName ?? ''}`}
      onClose={() => setEditing(null)}
      maxWidth="lg"
      footer={
        <FormDialogFooter
          onCancel={() => setEditing(null)}
          submitLabel="Save Changes"
          submitting={saving}
          formId="contract-form"
        />
      }
    >
      <form id="contract-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Dropdown
            label="Contract type"
            value={form.contractType}
            onChange={(value) => setForm((prev) => ({ ...prev, contractType: value }))}
            options={CONTRACT_TYPES}
            required
          />
          <Dropdown
            label="Employment status"
            value={form.status}
            onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'on_leave', label: 'On leave' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'resigned', label: 'Resigned' },
              { value: 'terminated', label: 'Terminated' },
            ]}
            required
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <InputField
            label="Contract end date"
            type="date"
            value={form.contractEndDate}
            onChange={(e) => setForm((prev) => ({ ...prev, contractEndDate: e.target.value }))}
          />
          <InputField
            label="Salary"
            type="number"
            min="0"
            step="0.01"
            value={form.salary}
            onChange={(e) => setForm((prev) => ({ ...prev, salary: e.target.value }))}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Leave the end date empty for an open-ended contract.
        </p>
        {formError && <ErrorBanner message={formError} />}
      </form>
    </FormDialog>
    </>
  );
}
