'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dropdown, ErrorBanner, ListPageShell, StatCard } from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';
import { money } from '@/lib/display';
import { toast } from '@/components/ui/Toast';
import { reportDataUrl, useReportFilters } from '@/components/reports/ReportWorkspace';

type Row = { id: string; code: string; name: string; type: string; opening: number; movementDebit: number; movementCredit: number; closing: number; closingDebit: number; closingCredit: number };
type Report = 'trial-balance' | 'profit-loss' | 'balance-sheet';
const REPORTS: Record<Report, string> = { 'trial-balance': 'Trial Balance', 'profit-loss': 'Income & Expense Statement', 'balance-sheet': 'Balance Sheet' };
const amountFor = (row: Row, report: Report) => report === 'profit-loss'
  ? row.type === 'income' ? row.movementCredit - row.movementDebit : row.movementDebit - row.movementCredit
  : row.type === 'asset' ? row.closing : -row.closing;

export default function AccountingReportsPage() {
  const filters = useReportFilters();
  const [rows, setRows] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report>('trial-balance');
  const load = useCallback(async () => { setLoading(true); try { const res = await fetch(reportDataUrl('/api/finance/accounting-reports', filters)); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not load report'); setRows(data.rows ?? []); setError(null); } catch (e) { const message = e instanceof Error ? e.message : 'Could not load report'; setError(message); toast.error(message); } finally { setLoading(false); } }, [filters]);
  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => rows.filter(row => report === 'trial-balance' || (report === 'profit-loss' ? ['income', 'expense'].includes(row.type) : ['asset', 'liability', 'equity'].includes(row.type))), [rows, report]);
  const list = useListQuery({ items: visible as (Row & Record<string, unknown>)[], searchKeys: ['code', 'name', 'type'] });
  const income = visible.filter(r => r.type === 'income').reduce((s, r) => s + amountFor(r, report), 0);
  const expenses = visible.filter(r => r.type === 'expense').reduce((s, r) => s + amountFor(r, report), 0);
  const assets = visible.filter(r => r.type === 'asset').reduce((s, r) => s + amountFor(r, report), 0);
  const liabilitiesAndEquity = visible.filter(r => r.type === 'liability' || r.type === 'equity').reduce((s, r) => s + amountFor(r, report), 0);
  const columns = report === 'trial-balance' ? [
    { key: 'code', header: 'Code' }, { key: 'name', header: 'Account' },
    { key: 'openingDebit', header: 'Opening debit', align: 'right' as const, render: (r: Row) => money(Math.max(r.opening, 0)) },
    { key: 'openingCredit', header: 'Opening credit', align: 'right' as const, render: (r: Row) => money(Math.max(-r.opening, 0)) },
    { key: 'movementDebit', header: 'Debit', align: 'right' as const, render: (r: Row) => money(r.movementDebit) },
    { key: 'movementCredit', header: 'Credit', align: 'right' as const, render: (r: Row) => money(r.movementCredit) },
    { key: 'closingDebit', header: 'Closing debit', align: 'right' as const, render: (r: Row) => money(r.closingDebit) },
    { key: 'closingCredit', header: 'Closing credit', align: 'right' as const, render: (r: Row) => money(r.closingCredit) },
  ] : [
    { key: 'code', header: 'Code' }, { key: 'name', header: 'Account' },
    { key: 'type', header: 'Category', render: (r: Row) => r.type[0].toUpperCase() + r.type.slice(1) },
    { key: 'amount', header: report === 'profit-loss' ? 'Period amount' : 'Balance at date', align: 'right' as const, render: (r: Row) => money(amountFor(r, report)) },
  ];
  return <ListPageShell title="Accounting Reports" description="Trial Balance, Income & Expense, and Balance Sheet from posted General Ledger entries." search={list.search} onSearchChange={list.setSearch} searchPlaceholder="Search account or code…" filters={[]} onResetFilters={() => list.reset()} loading={loading} columns={columns} rows={list.rows as Row[]} rowKey={row => row.id} page={list.page} perPage={list.perPage} total={list.total} onPageChange={list.setPage} onPerPageChange={list.setPerPage} emptyMessage="No posted accounting activity for these dates.">
    <div className="space-y-3"><Dropdown label="Report" value={report} onChange={value => setReport(value as Report)} options={Object.entries(REPORTS).map(([value, label]) => ({ value, label }))}/>{error && <ErrorBanner message={error}/>}<div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{report === 'trial-balance' ? <><StatCard label="Closing debits" value={money(visible.reduce((s,r)=>s+r.closingDebit,0))} accent="blue"/><StatCard label="Closing credits" value={money(visible.reduce((s,r)=>s+r.closingCredit,0))} accent="green"/></> : report === 'profit-loss' ? <><StatCard label="Income" value={money(income)} accent="green"/><StatCard label="Expenses" value={money(expenses)} accent="gold"/><StatCard label="Net result" value={money(income-expenses)} accent="blue"/></> : <><StatCard label="Assets" value={money(assets)} accent="blue"/><StatCard label="Liabilities & equity" value={money(liabilitiesAndEquity)} accent="purple"/><StatCard label="Difference" value={money(assets-liabilitiesAndEquity)} accent={Math.abs(assets-liabilitiesAndEquity)<0.01?'green':'gold'}/></>}</div></div>
  </ListPageShell>;
}
