import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num } from '@/lib/portal-api';

type PaymentRow = { amount: number | null; payment_date: string | null };
type ExpenseRow = { amount: number | null; expense_date: string | null; category: string };
type InvoiceRow = {
  student_id: string | null;
  total_amount: number | null;
  amount: number | null;
  paid_amount: number | null;
  outstanding_amount: number | null;
  status: string | null;
};
type StudentRow = { id: string; full_name: string | null; student_code: string | null };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const [paymentsRes, expensesRes, invoicesRes, studentsRes] = await Promise.all([
      (() => {
        const query = admin.from('payments').select('amount, payment_date');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin.from('expenses').select('amount, expense_date, category');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin
          .from('invoices')
          .select('student_id, total_amount, amount, paid_amount, outstanding_amount, status');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      admin.from('students').select('id, full_name, student_code'),
    ]);

    const payments = (paymentsRes.data ?? []) as PaymentRow[];
    const expenses = (expensesRes.data ?? []) as ExpenseRow[];
    const invoices = (invoicesRes.data ?? []) as InvoiceRow[];
    const studentById = new Map(
      ((studentsRes.data ?? []) as StudentRow[]).map((row) => [row.id, row])
    );

    const collected = payments.reduce((sum, row) => sum + num(row.amount), 0);
    const totalExpenses = expenses.reduce((sum, row) => sum + num(row.amount), 0);
    const outstanding = invoices.reduce(
      (sum, row) =>
        sum +
        (row.outstanding_amount == null
          ? Math.max(0, num(row.total_amount || row.amount) - num(row.paid_amount))
          : num(row.outstanding_amount)),
      0
    );

    const now = new Date();
    const monthly: { key: string; label: string; income: number; expenses: number }[] = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      monthly.push({
        key: monthKey(date),
        label: MONTHS[date.getMonth()],
        income: 0,
        expenses: 0,
      });
    }
    const monthIndex = new Map(monthly.map((month, index) => [month.key, index]));
    for (const row of payments) {
      const index = monthIndex.get(String(row.payment_date ?? '').slice(0, 7));
      if (index !== undefined) monthly[index].income += num(row.amount);
    }
    for (const row of expenses) {
      const index = monthIndex.get(String(row.expense_date ?? '').slice(0, 7));
      if (index !== undefined) monthly[index].expenses += num(row.amount);
    }

    const categoryTotals = new Map<string, number>();
    for (const row of expenses) {
      categoryTotals.set(row.category || 'Other', (categoryTotals.get(row.category || 'Other') ?? 0) + num(row.amount));
    }

    const statusTotals = new Map<string, number>();
    for (const row of invoices) {
      const status = row.status ?? 'unknown';
      statusTotals.set(status, (statusTotals.get(status) ?? 0) + 1);
    }

    const outstandingByStudent = new Map<string, number>();
    for (const row of invoices) {
      if (!row.student_id) continue;
      const value =
        row.outstanding_amount == null
          ? Math.max(0, num(row.total_amount || row.amount) - num(row.paid_amount))
          : num(row.outstanding_amount);
      if (value > 0) {
        outstandingByStudent.set(row.student_id, (outstandingByStudent.get(row.student_id) ?? 0) + value);
      }
    }

    const topOutstanding = [...outstandingByStudent.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([studentId, value]) => {
        const student = studentById.get(studentId);
        return {
          id: studentId,
          name: student?.full_name ?? 'Unnamed student',
          code: student?.student_code ?? null,
          outstanding: value,
        };
      });

    return NextResponse.json({
      summary: {
        collected,
        expenses: totalExpenses,
        net: collected - totalExpenses,
        outstanding,
        collectionRate: collected + outstanding > 0 ? Math.round((collected / (collected + outstanding)) * 100) : 0,
        invoices: invoices.length,
        studentsWithDues: outstandingByStudent.size,
      },
      monthly,
      expenseCategories: [...categoryTotals.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      invoiceStatus: [...statusTotals.entries()].map(([name, value]) => ({ name, value })),
      topOutstanding,
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load finance report');
  }
}
