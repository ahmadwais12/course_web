'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dropdown, ErrorBanner, FormDialog, FormDialogFooter, InputField, ListPageShell, PortButton, StatCard, StatusChip, statusToneFromValue } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { dateLabel, money } from '@/lib/display';

type VoucherRow = {
  id: string;
  voucherNo: string;
  type: 'receipt' | 'payment' | 'journal';
  date: string | null;
  party: string;
  description: string;
  amount: number;
  method: string | null;
  status: string;
};

type Summary = {
  receipts: number;
  receiptValue: number;
  payments: number;
  paymentValue: number;
  journals: number;
};

const TYPE_LABEL: Record<VoucherRow['type'], string> = {
  receipt: 'Receipt voucher',
  payment: 'Payment voucher',
  journal: 'Journal voucher',
};

export default function VouchersPage() {
  const [rows, setRows] = useState<VoucherRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: 'journal', date: new Date().toISOString().slice(0, 10), description: '', debitAccount: '', creditAccount: '', amount: '' });
  const [accounts, setAccounts] = useState<{ value: string; label: string }[]>([]);

  const loadVouchers = useCallback(async () => {
    const res = await fetch('/api/finance/vouchers'); const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load vouchers');
    setRows(Array.isArray(data.rows) ? data.rows : []); setSummary(data.summary ?? null);
  }, []);

  const openCreate = async () => {
    try { const res = await fetch('/api/finance/chart-of-accounts'); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not load accounts');
      const options = (data.rows ?? []).filter((row: {isActive:boolean}) => row.isActive).map((row: {id:string;code:string|null;name:string})=>({value:row.id,label:`${row.code ? `${row.code} · ` : ''}${row.name}`}));
      setAccounts(options); setForm({type:'journal',date:new Date().toISOString().slice(0,10),description:'',debitAccount:options[0]?.value??'',creditAccount:options[1]?.value??'',amount:''}); setCreateOpen(true);
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Could not load accounts'); }
  };
  const saveVoucher = async (event: React.FormEvent) => { event.preventDefault(); const amount=Number(form.amount); if(!form.description.trim()||!form.date||!form.debitAccount||!form.creditAccount||form.debitAccount===form.creditAccount||!Number.isFinite(amount)||amount<=0){toast.error('Complete the voucher fields and choose two different accounts.');return;}
    setSaving(true); try { const res=await fetch('/api/finance/journals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:form.date,description:form.description,referenceType:`voucher:${form.type}`,lines:[{accountId:form.debitAccount,debit:amount,credit:0},{accountId:form.creditAccount,debit:0,credit:amount}]})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Could not post voucher');toast.success('Voucher posted');setCreateOpen(false);await loadVouchers();}catch(e){toast.error(e instanceof Error?e.message:'Could not post voucher');}finally{setSaving(false);}
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/finance/vouchers');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load vouchers');
        if (!cancelled) {
          setRows(Array.isArray(data.rows) ? data.rows : []);
          setSummary(data.summary ?? null);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load vouchers';
          setRows([]);
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filterFn = useCallback(
    (row: VoucherRow) =>
      (!type || row.type === type) && (!status || row.status === status),
    [type, status]
  );

  const list = useListQuery({
    items: rows as (VoucherRow & Record<string, unknown>)[],
    searchKeys: ['voucherNo', 'party', 'description', 'method'],
    filterKey: `${type}|${status}`,
    filterFn: filterFn as (row: VoucherRow & Record<string, unknown>) => boolean,
  });

  const statusOptions = useMemo(() => {
    const set = new Set(rows.map((row) => row.status).filter(Boolean));
    return [...set].map((value) => ({ value, label: value }));
  }, [rows]);

  return (
    <ListPageShell
      title="Vouchers"
      description="Receipt, payment, and journal vouchers in one register"
      primaryAction={{ label: 'New Voucher', onClick: () => void openCreate() }}
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search voucher number, party, or description…"
      onResetFilters={() => {
        list.reset();
        setType('');
        setStatus('');
      }}
      filters={[
        {
          key: 'type',
          label: 'Voucher type',
          value: type,
          options: [
            { value: 'receipt', label: 'Receipts' },
            { value: 'payment', label: 'Payments' },
            { value: 'journal', label: 'Journals' },
          ],
          onChange: setType,
        },
        {
          key: 'status',
          label: 'Status',
          value: status,
          options: statusOptions,
          onChange: setStatus,
        },
      ]}
      loading={loading}
      columns={[
        {
          key: 'voucherNo',
          header: 'Voucher',
          render: (row) => (
            <div>
              <div className="font-semibold">{row.voucherNo}</div>
              <div className="text-xs text-muted-foreground">{TYPE_LABEL[row.type]}</div>
            </div>
          ),
        },
        { key: 'date', header: 'Date', render: (row) => dateLabel(row.date) },
        { key: 'party', header: 'Party' },
        {
          key: 'description',
          header: 'Description',
          render: (row) => (
            <span className="block max-w-[240px] truncate" title={row.description}>
              {row.description || '—'}
            </span>
          ),
        },
        {
          key: 'amount',
          header: 'Amount',
          align: 'right',
          render: (row) => (
            <span
              className={
                row.type === 'payment'
                  ? 'font-semibold text-rose-600 dark:text-rose-300'
                  : 'font-semibold text-emerald-600 dark:text-emerald-300'
              }
            >
              {row.type === 'payment' ? '−' : '+'}
              {money(row.amount)}
            </span>
          ),
        },
        {
          key: 'method',
          header: 'Method',
          render: (row) => (row.method ? row.method.replaceAll('_', ' ') : '—'),
        },
        {
          key: 'status',
          header: 'Status',
          render: (row) => <StatusChip label={row.status} tone={statusToneFromValue(row.status)} />,
        },
      ]}
      rows={list.rows as VoucherRow[]}
      rowKey={(row) => row.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage="No vouchers recorded yet."
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Receipts"
          value={money(summary?.receiptValue ?? 0)}
          hint={summary ? `${summary.receipts} vouchers` : undefined}
          accent="green"
        />
        <StatCard
          label="Payments"
          value={money(summary?.paymentValue ?? 0)}
          hint={summary ? `${summary.payments} vouchers` : undefined}
          accent="gold"
        />
        <StatCard label="Journal vouchers" value={summary?.journals ?? 0} accent="purple" />
        <StatCard
          label="Net movement"
          value={money((summary?.receiptValue ?? 0) - (summary?.paymentValue ?? 0))}
          accent="blue"
        />
      </div>
      {error && <ErrorBanner message={error} />}
      <FormDialog open={createOpen} onClose={() => setCreateOpen(false)} title="New balanced voucher" footer={<FormDialogFooter onCancel={() => setCreateOpen(false)} submitLabel="Post voucher" submitting={saving} formId="voucher-form" />}>
        <form id="voucher-form" onSubmit={saveVoucher} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Dropdown label="Voucher type" value={form.type} onChange={type=>setForm({...form,type})} options={[{value:'receipt',label:'Receipt'},{value:'payment',label:'Payment'},{value:'journal',label:'Journal'}]}/><InputField label="Posting date" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div><InputField label="Description" required value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><div className="grid gap-3 sm:grid-cols-2"><Dropdown label="Debit account" value={form.debitAccount} onChange={debitAccount=>setForm({...form,debitAccount})} options={accounts}/><Dropdown label="Credit account" value={form.creditAccount} onChange={creditAccount=>setForm({...form,creditAccount})} options={accounts}/></div><InputField label="Amount" type="number" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00"/></form>
      </FormDialog>
    </ListPageShell>
  );
}
