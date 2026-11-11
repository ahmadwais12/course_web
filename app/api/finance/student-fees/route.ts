import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num, str } from '@/lib/portal-api';

type StudentRow = {
  id: string;
  full_name: string | null;
  student_code: string | null;
  class_id: string | null;
  program_id: string | null;
  total_fees: number | null;
  paid_amount: number | null;
  outstanding_balance: number | null;
  status: string | null;
};

type InvoiceRow = {
  student_id: string | null;
  total_amount: number | null;
  amount: number | null;
  paid_amount: number | null;
  outstanding_amount: number | null;
  status: string | null;
  issue_date: string | null;
  due_date: string | null;
};

type NamedRow = { id: string; name: string | null };

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const [studentsRes, invoicesRes, classesRes, programsRes] = await Promise.all([
      (() => {
        const query = admin
          .from('students')
          .select(
            'id, full_name, student_code, class_id, program_id, total_fees, paid_amount, outstanding_balance, status'
          )
          .order('full_name');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin
          .from('invoices')
          .select('student_id, total_amount, amount, paid_amount, outstanding_amount, status, issue_date, due_date');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      admin.from('classes').select('id, name'),
      admin.from('programs').select('id, name'),
    ]);

    const students = (studentsRes.data ?? []) as StudentRow[];
    const invoices = (invoicesRes.data ?? []) as InvoiceRow[];
    const classById = new Map(((classesRes.data ?? []) as NamedRow[]).map((row) => [row.id, row.name]));
    const programById = new Map(((programsRes.data ?? []) as NamedRow[]).map((row) => [row.id, row.name]));

    const byStudent = new Map<string, { count: number; paid: number; overdue: number; lastIssue: string | null }>();
    for (const invoice of invoices) {
      if (!invoice.student_id) continue;
      const entry = byStudent.get(invoice.student_id) ?? { count: 0, paid: 0, overdue: 0, lastIssue: null };
      entry.count += 1;
      if (invoice.status === 'paid') entry.paid += 1;
      if (invoice.status === 'overdue') entry.overdue += 1;
      if (invoice.issue_date && (!entry.lastIssue || invoice.issue_date > entry.lastIssue)) {
        entry.lastIssue = invoice.issue_date;
      }
      byStudent.set(invoice.student_id, entry);
    }

    const rows = students.map((student) => {
      const studentInvoices = byStudent.get(student.id);
      const totalFees = num(student.total_fees);
      const paid = num(student.paid_amount);
      const outstanding = num(student.outstanding_balance) || Math.max(0, totalFees - paid);
      const overdue = (studentInvoices?.overdue ?? 0) > 0 && outstanding > 0;
      return {
        id: student.id,
        studentName: str(student.full_name) ?? 'Unnamed student',
        studentCode: str(student.student_code),
        className: student.class_id ? classById.get(student.class_id) ?? null : null,
        programName: student.program_id ? programById.get(student.program_id) ?? null : null,
        totalFees,
        paidAmount: paid,
        outstanding,
        invoiceCount: studentInvoices?.count ?? 0,
        paidInvoices: studentInvoices?.paid ?? 0,
        overdueInvoices: studentInvoices?.overdue ?? 0,
        lastInvoiceDate: studentInvoices?.lastIssue ?? null,
        billingStatus: overdue
          ? 'overdue'
          : outstanding <= 0 && totalFees > 0
            ? 'paid'
            : paid > 0
              ? 'partial'
              : totalFees > 0
                ? 'unpaid'
                : 'no fees',
        enrollmentStatus: str(student.status) ?? 'active',
      };
    });

    return NextResponse.json({
      rows,
      summary: {
        students: rows.length,
        totalFees: rows.reduce((sum, row) => sum + row.totalFees, 0),
        totalPaid: rows.reduce((sum, row) => sum + row.paidAmount, 0),
        outstanding: rows.reduce((sum, row) => sum + row.outstanding, 0),
        overdueStudents: rows.filter((row) => row.billingStatus === 'overdue').length,
      },
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load student fees');
  }
}
