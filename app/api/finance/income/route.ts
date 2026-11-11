import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num, str } from '@/lib/portal-api';

type PaymentRow = {
  id: string;
  payment_number: string | null;
  student_id: string | null;
  amount: number | null;
  payment_method: string | null;
  payment_date: string | null;
  payment_type: string | null;
  reference_number: string | null;
  status: string | null;
  notes: string | null;
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

    const [paymentsRes, studentsRes] = await Promise.all([
      (() => {
        const query = admin
          .from('payments')
          .select(
            'id, payment_number, student_id, amount, payment_method, payment_date, payment_type, reference_number, status, notes'
          )
          .order('payment_date', { ascending: false });
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      admin.from('students').select('id, full_name, student_code'),
    ]);

    const payments = (paymentsRes.data ?? []) as PaymentRow[];
    const byStudent = new Map(
      ((studentsRes.data ?? []) as StudentRow[]).map((row) => [row.id, row])
    );

    const rows = payments.map((row) => {
      const student = row.student_id ? byStudent.get(row.student_id) : undefined;
      return {
        id: row.id,
        reference: str(row.payment_number) ?? '—',
        studentId: row.student_id,
        studentName: str(student?.full_name) ?? 'Unassigned student',
        studentCode: str(student?.student_code),
        amount: num(row.amount),
        method: str(row.payment_method) ?? 'other',
        type: str(row.payment_type) ?? 'fee',
        referenceNumber: str(row.reference_number),
        date: row.payment_date,
        status: str(row.status) ?? 'completed',
        notes: str(row.notes),
      };
    });

    const now = new Date();
    const months: { key: string; label: string; income: number }[] = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      months.push({ key: monthKey(date), label: MONTHS[date.getMonth()], income: 0 });
    }
    const monthIndex = new Map(months.map((month, index) => [month.key, index]));

    const methodTotals = new Map<string, number>();
    for (const row of rows) {
      const key = String(row.date ?? '').slice(0, 7);
      const index = monthIndex.get(key);
      if (index !== undefined) months[index].income += row.amount;
      methodTotals.set(row.method, (methodTotals.get(row.method) ?? 0) + row.amount);
    }

    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    const thisMonth = months[months.length - 1]?.income ?? 0;

    return NextResponse.json({
      rows,
      months,
      methods: [...methodTotals.entries()].map(([method, value]) => ({ method, value })),
      summary: {
        total,
        thisMonth,
        average: rows.length ? total / rows.length : 0,
        entries: rows.length,
      },
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load income');
  }
}
