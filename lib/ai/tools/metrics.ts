/**
 * Shared, tenant-scoped aggregations reused by finance, academic, and report tools.
 * Definitions follow the existing dashboard (`app/api/dashboard/stats/route.ts`):
 * revenue = sum of `payments.amount` where status = 'completed', by `payment_date`.
 */
import type { ResolvedPeriod } from '@/lib/ai/period';
import type { AIRequestContext } from '@/lib/ai/types';
import {
  dayEnd,
  dayStart,
  fetchRows,
  idsOrNil,
  money,
  num,
  scoped,
  sumBy,
  teacherClassIds,
  type ToolDb,
} from '@/lib/ai/tools/common';

export type PaymentRow = {
  amount: number | null;
  refund_amount: number | null;
  discount_amount: number | null;
  status: string | null;
  payment_method: string | null;
  payment_type: string | null;
  payment_date: string | null;
  tenant_id: string | null;
};

export async function loadPayments(db: ToolDb, ctx: AIRequestContext, p: ResolvedPeriod) {
  return fetchRows<PaymentRow>(
    scoped(
      db
        .from('payments')
        .select('amount, refund_amount, discount_amount, status, payment_method, payment_type, payment_date, tenant_id'),
      ctx
    )
      .gte('payment_date', p.from)
      .lte('payment_date', p.to)
      .limit(10000)
  );
}

export function revenueOf(rows: PaymentRow[]) {
  const completed = rows.filter((r) => r.status === 'completed');
  return {
    revenue: money(completed.reduce((s, r) => s + num(r.amount), 0)),
    completed_count: completed.length,
    refunds_recorded: money(rows.reduce((s, r) => s + num(r.refund_amount), 0)),
    byTenant: sumBy(completed, (r) => r.tenant_id, (r) => num(r.amount)),
  };
}

export type ExpenseRow = {
  amount: number | null;
  status: string | null;
  category: string | null;
  expense_date: string | null;
  tenant_id: string | null;
};

/** Recorded expenses = approved + paid; pending and rejected are reported separately. */
export async function loadExpenses(db: ToolDb, ctx: AIRequestContext, p: ResolvedPeriod) {
  return fetchRows<ExpenseRow>(
    scoped(db.from('expenses').select('amount, status, category, expense_date, tenant_id'), ctx)
      .gte('expense_date', p.from)
      .lte('expense_date', p.to)
      .limit(10000)
  );
}

export function expensesOf(rows: ExpenseRow[]) {
  const recorded = rows.filter((r) => r.status === 'approved' || r.status === 'paid');
  const pending = rows.filter((r) => r.status === 'pending');
  return {
    recorded: money(recorded.reduce((s, r) => s + num(r.amount), 0)),
    recorded_count: recorded.length,
    pending: money(pending.reduce((s, r) => s + num(r.amount), 0)),
    pending_count: pending.length,
    byTenant: sumBy(recorded, (r) => r.tenant_id, (r) => num(r.amount)),
    byCategory: sumBy(recorded, (r) => r.category, (r) => num(r.amount)),
  };
}

export type StudentRow = {
  id: string;
  full_name?: string | null;
  status: string | null;
  tenant_id: string | null;
  class_id?: string | null;
  created_at: string | null;
};

export async function loadStudents(db: ToolDb, ctx: AIRequestContext, columns = 'id, status, tenant_id, class_id, created_at') {
  const classIds = await teacherClassIds(db, ctx);
  let query = scoped(db.from('students').select(columns), ctx);
  if (classIds) query = query.in('class_id', idsOrNil(classIds));
  return fetchRows<StudentRow>(query.limit(10000));
}

export async function loadNewStudents(db: ToolDb, ctx: AIRequestContext, p: ResolvedPeriod) {
  const classIds = await teacherClassIds(db, ctx);
  let query = scoped(db.from('students').select('id, status, tenant_id, created_at'), ctx)
    .gte('created_at', dayStart(p.from))
    .lte('created_at', dayEnd(p.to));
  if (classIds) query = query.in('class_id', idsOrNil(classIds));
  return fetchRows<StudentRow>(query.limit(10000));
}

export type AttendanceRow = { person_id: string; status: string | null; date: string; tenant_id: string | null };

/** Student attendance in range; teachers are limited to students of their own classes. */
export async function loadStudentAttendance(db: ToolDb, ctx: AIRequestContext, p: ResolvedPeriod) {
  const classIds = await teacherClassIds(db, ctx);
  let query = scoped(db.from('attendance').select('person_id, status, date, tenant_id'), ctx)
    .eq('person_type', 'student')
    .gte('date', p.from)
    .lte('date', p.to);
  let restrictedTo: Set<string> | null = null;
  if (classIds) {
    const { rows } = await fetchRows<{ id: string }>(
      scoped(db.from('students').select('id'), ctx).in('class_id', idsOrNil(classIds)).limit(500),
      500
    );
    restrictedTo = new Set(rows.map((r) => r.id));
    query = query.in('person_id', idsOrNil([...restrictedTo]));
  }
  return fetchRows<AttendanceRow>(query.limit(10000));
}

/** Attended = present + late. Excused and half-day are reported separately, not counted as attended. */
export function attendanceOf(rows: AttendanceRow[]) {
  const status: Record<string, number> = {};
  for (const r of rows) status[r.status || 'unmarked'] = (status[r.status || 'unmarked'] ?? 0) + 1;
  const attended = (status.present ?? 0) + (status.late ?? 0);
  return { marked: rows.length, attended, status };
}
