'use client';

import { useEffect, useMemo, useState } from 'react';
import { ErrorBanner, ListPageShell, StatCard } from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';
import { money } from '@/lib/display';
import { toast } from '@/components/ui/Toast';

type LedgerRow = { id: string; date: string; voucher: string; reference: string; account: string; accountCode: string; description: string; debit: number; credit: number; runningBalance: number };
export default function GeneralLedgerPage() {
  const [rows, setRows] = useState<LedgerRow[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(''); const [dateTo, setDateTo] = useState('');
  useEffect(() => { let cancelled = false; (async () => { try { const res = await fetch('/api/finance/general-ledger'); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not load ledger'); if (!cancelled) setRows(data.rows ?? []); } catch (e) { if (!cancelled) { const msg = e instanceof Error ? e.message : 'Could not load ledger'; setError(msg); toast.error(msg); } } finally { if (!cancelled) setLoading(false); } })(); return () => { cancelled = true; }; }, []);
  const filtered = useMemo(() => rows.filter(r => (!dateFrom || r.date >= dateFrom) && (!dateTo || r.date <= dateTo)), [rows, dateFrom, dateTo]);
  const list = useListQuery({ items: filtered as (LedgerRow & Record<string, unknown>)[], searchKeys: ['voucher', 'account', 'accountCode', 'description', 'reference'], filterKey: `${dateFrom}|${dateTo}` });
  const debit = filtered.reduce((s, r) => s + r.debit, 0); const credit = filtered.reduce((s, r) => s + r.credit, 0);
  return <ListPageShell title="General Ledger" description="Posted debit and credit entries traced to their source vouchers." search={list.search} onSearchChange={list.setSearch} searchPlaceholder="Search account, voucher, or description…" dateFrom={dateFrom} dateTo={dateTo} onDateRangeChange={range=>{setDateFrom(range.from);setDateTo(range.to);}} onResetFilters={()=>{setDateFrom('');setDateTo('');list.reset();}} loading={loading} columns={[{ key: 'date', header: 'Posting date' }, { key: 'voucher', header: 'Voucher' }, { key: 'account', header: 'Account', render: r => <div><b>{r.account}</b><div className="text-xs text-muted-foreground">{r.accountCode || 'No code'}</div></div> }, { key: 'description', header: 'Description' }, { key: 'debit', header: 'Debit', align: 'right', render: r => money(r.debit) }, { key: 'credit', header: 'Credit', align: 'right', render: r => money(r.credit) }, { key: 'runningBalance', header: 'Running balance', align: 'right', render: r => money(r.runningBalance) }]} rows={list.rows as LedgerRow[]} rowKey={r => r.id} page={list.page} perPage={list.perPage} total={list.total} onPageChange={list.setPage} onPerPageChange={list.setPerPage} emptyMessage="No posted ledger entries yet."><div className="grid grid-cols-2 gap-3"><StatCard label="Posted debits" value={money(debit)} accent="blue"/><StatCard label="Posted credits" value={money(credit)} accent="green"/></div>{error && <ErrorBanner message={error}/>}</ListPageShell>;
}
