import { ToolArgumentError, toISODate } from '@/lib/ai/period';
import {
  PERIOD_PARAMS,
  countBy,
  fetchRows,
  labelTenants,
  money,
  num,
  periodFrom,
  scopeInfo,
  scoped,
  tenantNameMap,
  topEntries,
  type ToolDefinition,
} from '@/lib/ai/tools/common';

type EmployeeRow = { status: string | null; tenant_id: string | null; department?: string | null; department_id?: string | null };

async function loadEmployees(db: Parameters<ToolDefinition['execute']>[2], ctx: Parameters<ToolDefinition['execute']>[1]) {
  const [teachers, staff] = await Promise.all([
    fetchRows<EmployeeRow>(scoped(db.from('teachers').select('status, tenant_id, department_id'), ctx).limit(10000)),
    fetchRows<EmployeeRow>(scoped(db.from('staff').select('status, tenant_id, department'), ctx).limit(10000)),
  ]);
  return { teachers: teachers.rows, staff: staff.rows, truncated: teachers.truncated || staff.truncated };
}

const getEmployeeCount: ToolDefinition = {
  name: 'get_employee_count',
  module: 'hr',
  description: 'Number of employees (teachers + staff) by status and branch.',
  parameters: { type: 'object', properties: {} },
  async execute(_args, ctx, db) {
    const { teachers, staff, truncated } = await loadEmployees(db, ctx);
    const all = [...teachers, ...staff];
    const names = await tenantNameMap(db, ctx, all.map((r) => r.tenant_id || ''));
    const active = all.filter((r) => r.status === 'active' || r.status === null).length;
    return {
      data: {
        total_employees: all.length,
        active_employees: active,
        teachers: teachers.length,
        staff: staff.length,
        by_status: countBy(all, (r) => r.status),
        by_branch: labelTenants(countBy(all, (r) => r.tenant_id), names),
        truncated,
      },
      scope: scopeInfo(ctx, undefined, { basis: 'Teachers and staff records; status null is treated as active.' }),
      chart: {
        type: 'pie',
        title: 'Employees by type',
        data: [
          { label: 'Teachers', employees: teachers.length },
          { label: 'Staff', employees: staff.length },
        ],
        series: [{ key: 'employees', label: 'Employees' }],
      },
      links: [{ label: 'Employees', href: '/hr/staff' }],
    };
  },
};

const getEmployeeAttendance: ToolDefinition = {
  name: 'get_employee_attendance',
  module: 'hr',
  description: 'Employee (teacher + staff) attendance for one day (default today): present, absent, late, unmarked, and approved leave.',
  parameters: {
    type: 'object',
    properties: { date: { type: 'string', description: 'Day to check, YYYY-MM-DD. Default today.' } },
  },
  async execute(args, ctx, db) {
    const date = typeof args.date === 'string' ? args.date : toISODate(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ToolArgumentError('date must be YYYY-MM-DD');
    const [{ rows: marks }, employees, { rows: leaves }] = await Promise.all([
      fetchRows<{ status: string | null; person_type: string }>(
        scoped(db.from('attendance').select('status, person_type'), ctx)
          .in('person_type', ['teacher', 'staff'])
          .eq('date', date)
          .limit(10000)
      ),
      loadEmployees(db, ctx),
      fetchRows<{ start_date: string; end_date: string | null }>(
        scoped(db.from('employee_leaves').select('start_date, end_date'), ctx)
          .eq('status', 'approved')
          .lte('start_date', date)
          .limit(5000),
        5000
      ),
    ]);
    const onLeave = leaves.filter((l) => (l.end_date ? l.end_date >= date : l.start_date === date)).length;
    const active = [...employees.teachers, ...employees.staff].filter((r) => r.status === 'active' || r.status === null).length;
    const byStatus = countBy(marks, (r) => r.status);
    return {
      data: {
        date,
        active_employees: active,
        attendance_marked: marks.length,
        unmarked: Math.max(0, active - marks.length),
        by_status: byStatus,
        absent: byStatus.absent ?? 0,
        approved_leave: onLeave,
        by_type: countBy(marks, (r) => r.person_type),
      },
      scope: scopeInfo(ctx, undefined, { day: date }),
      links: [
        { label: 'HR Attendance', href: '/hr/attendance' },
        { label: 'Leave', href: '/leaves' },
      ],
      notes: marks.length === 0 ? ['No employee attendance has been recorded for this day yet.'] : [],
    };
  },
};

const getDepartmentSummary: ToolDefinition = {
  name: 'get_department_summary',
  module: 'hr',
  description: 'Employee distribution by department (staff department + teacher department).',
  parameters: { type: 'object', properties: {} },
  async execute(_args, ctx, db) {
    const { teachers, staff, truncated } = await loadEmployees(db, ctx);
    const deptIds = [...new Set(teachers.map((t) => t.department_id).filter(Boolean) as string[])];
    const { data } = deptIds.length
      ? await scoped(db.from('departments').select('id, name'), ctx).in('id', deptIds)
      : { data: [] };
    const deptNames: Record<string, string> = {};
    for (const d of (data ?? []) as { id: string; name: string }[]) deptNames[d.id] = d.name;
    const counts: Record<string, number> = {};
    for (const t of teachers) {
      const label = (t.department_id && deptNames[t.department_id]) || 'Teachers (no department)';
      counts[label] = (counts[label] ?? 0) + 1;
    }
    for (const s of staff) {
      const label = s.department?.trim() || 'Staff (no department)';
      counts[label] = (counts[label] ?? 0) + 1;
    }
    const top = topEntries(counts, 15);
    return {
      data: { departments: Object.fromEntries(top), department_count: Object.keys(counts).length, truncated },
      scope: scopeInfo(ctx),
      chart: {
        type: 'bar',
        title: 'Employees by department',
        data: top.map(([label, value]) => ({ label, employees: value })),
        series: [{ key: 'employees', label: 'Employees' }],
      },
      links: [{ label: 'Employees', href: '/hr/staff' }],
    };
  },
};

const getPayrollSummary: ToolDefinition = {
  name: 'get_payroll_summary',
  module: 'payroll',
  description:
    'Payroll runs overlapping the period (gross, deductions, net, status) and pending payroll periods. Aggregates only — no individual salaries.',
  parameters: { type: 'object', properties: { ...PERIOD_PARAMS } },
  async execute(args, ctx, db) {
    const period = periodFrom(args);
    const [{ rows: runs, truncated }, { rows: salaries }] = await Promise.all([
      fetchRows<{
        name: string;
        payroll_period: string | null;
        period_start: string;
        period_end: string;
        pay_date: string | null;
        total_gross: number | null;
        total_deductions: number | null;
        total_net: number | null;
        employee_count: number | null;
        status: string | null;
      }>(
        scoped(
          db
            .from('payroll')
            .select('name, payroll_period, period_start, period_end, pay_date, total_gross, total_deductions, total_net, employee_count, status'),
          ctx
        )
          .lte('period_start', period.to)
          .gte('period_end', period.from)
          .order('period_start', { ascending: false })
          .limit(200),
        200
      ),
      fetchRows<{ month: number; year: number; net_salary: number | null; status: string | null }>(
        scoped(db.from('salaries').select('month, year, net_salary, status'), ctx)
          .gte('year', Number(period.from.slice(0, 4)))
          .lte('year', Number(period.to.slice(0, 4)))
          .limit(10000)
      ),
    ]);
    const fromKey = period.from.slice(0, 7);
    const toKey = period.to.slice(0, 7);
    const inRange = salaries.filter((s) => {
      const key = `${s.year}-${String(s.month).padStart(2, '0')}`;
      return key >= fromKey && key <= toKey;
    });
    const pending = runs.filter((r) => ['draft', 'processing', 'approved'].includes(r.status || ''));
    return {
      data: {
        payroll_runs: runs.length,
        total_gross: money(runs.reduce((s, r) => s + num(r.total_gross), 0)),
        total_deductions: money(runs.reduce((s, r) => s + num(r.total_deductions), 0)),
        total_net: money(runs.reduce((s, r) => s + num(r.total_net), 0)),
        runs_by_status: countBy(runs, (r) => r.status),
        pending_payroll_periods: pending.map((r) => ({
          name: r.name,
          period: `${r.period_start} to ${r.period_end}`,
          status: r.status,
          net: money(num(r.total_net)),
          employees: r.employee_count,
        })),
        salary_records: inRange.length,
        salary_net_by_status: Object.fromEntries(
          Object.entries(
            inRange.reduce<Record<string, number>>((acc, s) => {
              const k = s.status || 'unspecified';
              acc[k] = money((acc[k] ?? 0) + num(s.net_salary));
              return acc;
            }, {})
          )
        ),
        truncated,
      },
      scope: scopeInfo(ctx, period, {
        currency: ctx.currency,
        basis: 'Payroll runs whose period overlaps the range; salary records by month/year.',
      }),
      links: [
        { label: 'Payroll', href: '/hr/payroll' },
        { label: 'Salaries', href: '/salaries' },
      ],
      notes: runs.length === 0 && inRange.length === 0 ? ['No payroll data recorded for this period.'] : [],
    };
  },
};

export const hrTools: ToolDefinition[] = [getEmployeeCount, getEmployeeAttendance, getDepartmentSummary, getPayrollSummary];
