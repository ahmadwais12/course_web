import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num, str } from '@/lib/portal-api';

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;
    const journalQuery = admin.from('journals').select('id, journal_no, journal_date, description, reference_type, is_posted').eq('is_posted', true).order('journal_date', { ascending: false });
    const { data: journalData, error: journalError } = await (tenantId ? journalQuery.eq('tenant_id', tenantId) : journalQuery);
    if (journalError) return NextResponse.json({ error: journalError.message }, { status: 500 });
    const journals = (journalData ?? []) as { id: string; journal_no: string | null; journal_date: string; description: string | null; reference_type: string | null; is_posted: boolean }[];
    if (!journals.length) return NextResponse.json({ rows: [] });
    const [{ data: entriesData, error: entriesError }, { data: accountsData, error: accountsError }] = await Promise.all([
      admin.from('journal_entries').select('id, journal_id, account_id, account_code, description, debit, credit').in('journal_id', journals.map((row) => row.id)),
      (() => { const q = admin.from('accounts').select('id, account_code, name'); return tenantId ? q.eq('tenant_id', tenantId) : q; })(),
    ]);
    if (entriesError) return NextResponse.json({ error: entriesError.message }, { status: 500 });
    if (accountsError) return NextResponse.json({ error: accountsError.message }, { status: 500 });
    const journalById = new Map(journals.map((row) => [row.id, row]));
    const accountById = new Map(((accountsData ?? []) as { id: string; account_code: string | null; name: string }[]).map((row) => [row.id, row]));
    const chronological = ((entriesData ?? []) as { id: string; journal_id: string | null; account_id: string | null; account_code: string | null; description: string | null; debit: number | null; credit: number | null }[])
      .map((entry) => { const journal = entry.journal_id ? journalById.get(entry.journal_id) : null; const account = entry.account_id ? accountById.get(entry.account_id) : null; return { id: entry.id, date: journal?.journal_date ?? '', voucher: journal?.journal_no ?? '—', reference: journal?.reference_type ?? '', account: account?.name ?? 'Unknown account', accountCode: account?.account_code ?? entry.account_code ?? '', description: str(entry.description) ?? str(journal?.description) ?? '', debit: num(entry.debit), credit: num(entry.credit), accountId: entry.account_id ?? '' }; })
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const balances = new Map<string, number>();
    const rows = chronological.map(({accountId, ...entry}) => { const balance = (balances.get(accountId) ?? 0) + entry.debit - entry.credit; balances.set(accountId, balance); return {...entry, runningBalance: balance}; }).reverse();
    return NextResponse.json({ rows });
  } catch (error: unknown) { return dashboardError(error, 'Failed to load general ledger'); }
}
