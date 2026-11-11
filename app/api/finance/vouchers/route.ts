import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num, str } from '@/lib/portal-api';

type PaymentRow = {
  id: string;
  payment_number: string | null;
  amount: number | null;
  payment_date: string | null;
  payment_method: string | null;
  payment_type: string | null;
  status: string | null;
  student_id: string | null;
};

type ExpenseRow = {
  id: string;
  category: string;
  amount: number | null;
  expense_date: string | null;
  payment_method: string | null;
  status: string | null;
  vendor: string | null;
  invoice_number: string | null;
  description: string | null;
};

type JournalRow = {
  id: string;
  journal_no: string | null;
  journal_date: string | null;
  description: string | null;
  reference_type: string | null;
  total_debit: number | null;
  is_posted: boolean | null;
};

type StudentRow = { id: string; full_name: string | null };

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const [paymentsRes, expensesRes, journalsRes, studentsRes] = await Promise.all([
      (() => {
        const query = admin
          .from('payments')
          .select('id, payment_number, amount, payment_date, payment_method, payment_type, status, student_id')
          .order('payment_date', { ascending: false });
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin
          .from('expenses')
          .select('id, category, amount, expense_date, payment_method, status, vendor, invoice_number, description')
          .order('expense_date', { ascending: false });
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin
          .from('journals')
          .select('id, journal_no, journal_date, description, reference_type, total_debit, is_posted')
          .order('journal_date', { ascending: false });
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      admin.from('students').select('id, full_name'),
    ]);

    const studentById = new Map(
      ((studentsRes.data ?? []) as StudentRow[]).map((row) => [row.id, str(row.full_name)])
    );

    const rows = [
      ...((paymentsRes.data ?? []) as PaymentRow[]).map((row) => ({
        id: `receipt-${row.id}`,
        voucherNo: str(row.payment_number) ?? '—',
        type: 'receipt' as const,
        date: row.payment_date,
        party: row.student_id ? studentById.get(row.student_id) ?? 'Student' : 'Student',
        description: str(row.payment_type) ?? 'Fee payment',
        amount: num(row.amount),
        method: str(row.payment_method),
        status: str(row.status) ?? 'completed',
      })),
      ...((expensesRes.data ?? []) as ExpenseRow[]).map((row) => ({
        id: `payment-${row.id}`,
        voucherNo: str(row.invoice_number) ?? `EXP-${row.id.slice(0, 8).toUpperCase()}`,
        type: 'payment' as const,
        date: row.expense_date,
        party: str(row.vendor) ?? 'Vendor',
        description: str(row.description) ?? row.category,
        amount: num(row.amount),
        method: str(row.payment_method),
        status: str(row.status) ?? 'pending',
      })),
      ...((journalsRes.data ?? []) as JournalRow[]).map((row) => ({
        id: `journal-${row.id}`,
        voucherNo: str(row.journal_no) ?? '—',
        type: 'journal' as const,
        date: row.journal_date,
        party: str(row.reference_type) ?? 'General ledger',
        description: str(row.description) ?? 'Journal entry',
        amount: num(row.total_debit),
        method: null,
        status: row.is_posted ? 'posted' : 'draft',
      })),
    ].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));

    const sum = (type: 'receipt' | 'payment' | 'journal') =>
      rows.filter((row) => row.type === type).reduce((total, row) => total + row.amount, 0);

    return NextResponse.json({
      rows,
      summary: {
        receipts: rows.filter((row) => row.type === 'receipt').length,
        receiptValue: sum('receipt'),
        payments: rows.filter((row) => row.type === 'payment').length,
        paymentValue: sum('payment'),
        journals: rows.filter((row) => row.type === 'journal').length,
      },
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load vouchers');
  }
}
