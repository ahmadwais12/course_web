import { previousPeriod, toISODate, type ResolvedPeriod } from '@/lib/ai/period';
import {
  PERIOD_PARAMS,
  ToolScopeError,
  countBy,
  fetchRows,
  money,
  pct,
  periodFrom,
  scopeInfo,
  scoped,
  tenantNameMap,
  type ToolDb,
  type ToolDefinition,
} from '@/lib/ai/tools/common';
import {
  attendanceOf,
  expensesOf,
  loadExpenses,
  loadNewStudents,
  loadPayments,
  loadStudentAttendance,
  revenueOf,
} from '@/lib/ai/tools/metrics';
import type { AIRequestContext } from '@/lib/ai/types';

/** Each metric is computed only when the user may see its module. */
async function periodMetrics(db: ToolDb, ctx: AIRequestContext, p: ResolvedPeriod) {
  const out: Record<string, number | null> = {};
  const jobs: Promise<void>[] = [];
  if (ctx.allowedModules.includes('academic')) {
    jobs.push(
      loadNewStudents(db, ctx, p).then(({ rows }) => {
        out.new_students = rows.length;
      }),
      fetchRows<{ id: string }>(
        scoped(db.from('student_enrollments').select('id'), ctx)
          .gte('enrollment_date', p.from)
          .lte('enrollment_date', p.to)
          .limit(10000)
      ).then(({ rows }) => {
        out.new_enrollments = rows.length;
      }),
      loadStudentAttendance(db, ctx, p).then(({ rows }) => {
        const a = attendanceOf(rows);
        out.attendance_rate_percent = pct(a.attended, a.marked);
      })
    );
  }
  if (ctx.allowedModules.includes('finance')) {
    jobs.push(
      loadPayments(db, ctx, p).then(({ rows }) => {
        out.revenue = revenueOf(rows).revenue;
      }),
      loadExpenses(db, ctx, p).then(({ rows }) => {
        out.recorded_expenses = expensesOf(rows).recorded;
      })
    );
  }
  await Promise.all(jobs);
  if (out.revenue !== undefined && out.recorded_expenses !== undefined) {
    out.net_cash_estimate = money((out.revenue ?? 0) - (out.recorded_expenses ?? 0));
  }
  return out;
}

function change(current: number | null | undefined, previous: number | null | undefined) {
  if (current === null || current === undefined || previous === null || previous === undefined) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

const getMonthlyBusinessSummary: ToolDefinition = {
  name: 'get_monthly_business_summary',
  module: 'reports',
  description:
    'Business performance for a month compared with the previous month: new students, enrollments, attendance rate, revenue, expenses (only modules the user may access).',
  parameters: {
    type: 'object',
    properties: { month: { type: 'string', description: 'Month YYYY-MM. Default current month (to date).' } },
  },
  async execute(args, ctx, db) {
    let current: ResolvedPeriod;
    if (typeof args.month === 'string' && /^\d{4}-\d{2}$/.test(args.month)) {
      const [y, m] = args.month.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      const today = new Date();
      current = {
        key: 'custom',
        from: toISODate(start),
        to: toISODate(end > today ? today : end),
        label: args.month,
      };
    } else {
      current = periodFrom({ period: 'this_month' });
    }
    const prev = previousPeriod({ ...current, key: 'this_month' });
    const [now, before] = await Promise.all([periodMetrics(db, ctx, current), periodMetrics(db, ctx, prev)]);
    const metrics = Object.keys(now).map((key) => ({
      metric: key,
      current: now[key],
      previous: before[key] ?? null,
      change_percent: change(now[key], before[key]),
    }));
    return {
      data: { current_period: current, previous_period: prev, metrics },
      scope: scopeInfo(ctx, current, {
        currency: ctx.currency,
        basis:
          'Revenue = completed payments; expenses = approved/paid; attendance = (present + late) / marked. The current month is month-to-date, so compare with care.',
        modules_included: ctx.allowedModules.filter((m) => m === 'academic' || m === 'finance'),
      }),
      chart: {
        type: 'bar',
        title: 'This month vs previous month',
        data: metrics
          .filter((m) => m.metric !== 'attendance_rate_percent')
          .map((m) => ({ label: m.metric.replace(/_/g, ' '), current: m.current ?? 0, previous: m.previous ?? 0 })),
        series: [
          { key: 'current', label: current.label },
          { key: 'previous', label: prev.label },
        ],
      },
      links: [{ label: 'All Reports', href: '/reports' }],
    };
  },
};

const getBranchComparison: ToolDefinition = {
  name: 'get_branch_comparison',
  module: 'reports',
  description:
    'Compare branches in the organization for the period: active students, new students, attendance rate, revenue, expenses (only modules the user may access).',
  parameters: { type: 'object', properties: { ...PERIOD_PARAMS } },
  async execute(args, ctx, db) {
    if (!ctx.isPlatformScope && (!ctx.tenantScope || ctx.tenantScope.length === 0)) throw new ToolScopeError('No scope');
    const period = periodFrom(args);
    const academic = ctx.allowedModules.includes('academic');
    const finance = ctx.allowedModules.includes('finance');
    const [students, newStudents, attendance, payments, expenses] = await Promise.all([
      academic
        ? fetchRows<{ tenant_id: string | null; status: string | null }>(
            scoped(db.from('students').select('tenant_id, status'), ctx).limit(10000)
          )
        : null,
      academic ? loadNewStudents(db, ctx, period) : null,
      academic ? loadStudentAttendance(db, ctx, period) : null,
      finance ? loadPayments(db, ctx, period) : null,
      finance ? loadExpenses(db, ctx, period) : null,
    ]);
    const tenantIds = new Set<string>(ctx.tenantScope ?? []);
    for (const set of [students?.rows, payments?.rows]) for (const r of set ?? []) if (r.tenant_id) tenantIds.add(r.tenant_id);
    const names = await tenantNameMap(db, ctx, [...tenantIds]);

    const activeBy = students ? countBy(students.rows.filter((s) => s.status === 'active'), (s) => s.tenant_id) : {};
    const newBy = newStudents ? countBy(newStudents.rows, (s) => s.tenant_id) : {};
    const revenueBy = payments ? revenueOf(payments.rows).byTenant : {};
    const expenseBy = expenses ? expensesOf(expenses.rows).byTenant : {};
    const attendanceBy: Record<string, { marked: number; attended: number }> = {};
    for (const r of attendance?.rows ?? []) {
      const k = r.tenant_id || 'unspecified';
      const a = r.status === 'present' || r.status === 'late' ? 1 : 0;
      attendanceBy[k] = { marked: (attendanceBy[k]?.marked ?? 0) + 1, attended: (attendanceBy[k]?.attended ?? 0) + a };
    }

    const branches = [...tenantIds].slice(0, 30).map((id) => ({
      branch: names[id] || 'Unnamed',
      ...(academic
        ? {
            active_students: activeBy[id] ?? 0,
            new_students: newBy[id] ?? 0,
            attendance_rate_percent: attendanceBy[id] ? pct(attendanceBy[id].attended, attendanceBy[id].marked) : null,
          }
        : {}),
      ...(finance ? { revenue: revenueBy[id] ?? 0, recorded_expenses: expenseBy[id] ?? 0 } : {}),
    }));

    const chartKey = finance ? 'revenue' : 'active_students';
    return {
      data: { branch_count: branches.length, branches },
      scope: scopeInfo(ctx, period, {
        currency: ctx.currency,
        modules_included: [academic && 'academic', finance && 'finance'].filter(Boolean),
      }),
      chart: academic || finance
        ? {
            type: 'bar',
            title: finance ? 'Revenue by branch' : 'Active students by branch',
            data: branches.map((b) => ({ label: b.branch, [chartKey]: Number((b as Record<string, unknown>)[chartKey] ?? 0) })),
            series: [{ key: chartKey, label: finance ? 'Revenue' : 'Active students' }],
            valueFormat: finance ? 'currency' : 'number',
            currency: ctx.currency,
          }
        : undefined,
      links: [{ label: 'Branches', href: '/business/branches' }],
      notes:
        branches.length <= 1
          ? ['Only one branch is in your scope, so there is nothing to compare across branches.']
          : [],
    };
  },
};

export const reportTools: ToolDefinition[] = [getMonthlyBusinessSummary, getBranchComparison];
