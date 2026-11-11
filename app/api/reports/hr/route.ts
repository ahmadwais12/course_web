import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num } from '@/lib/portal-api';

type TeacherRow = { department_id: string | null; status: string | null };
type StaffRow = { department: string | null; status: string | null };
type LeaveRow = { status: string | null; start_date: string | null; end_date: string | null };
type PayrollRow = { pay_date: string | null; total_net: number | null; total_gross: number | null; employee_count: number | null; status: string | null };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function daysBetween(start: string | null, end: string | null) {
  if (!start) return 0;
  const from = new Date(`${start.slice(0, 10)}T00:00:00`);
  const to = end ? new Date(`${end.slice(0, 10)}T00:00:00`) : from;
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);
}

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const [teachersRes, staffRes, deptRes, leavesRes, payrollRes] = await Promise.all([
      (() => {
        const query = admin.from('teachers').select('department_id, status');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin.from('staff').select('department, status');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin.from('departments').select('id, name');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin.from('employee_leaves').select('status, start_date, end_date');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin
          .from('payroll')
          .select('pay_date, total_net, total_gross, employee_count, status');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
    ]);

    const teachers = (teachersRes.data ?? []) as TeacherRow[];
    const staff = (staffRes.data ?? []) as StaffRow[];
    const departments = (deptRes.data ?? []) as { id: string; name: string }[];
    const leaves = (leavesRes.data ?? []) as LeaveRow[];
    const payrolls = (payrollRes.data ?? []) as PayrollRow[];

    const deptName = new Map(departments.map((row) => [row.id, row.name]));
    const deptCounts = new Map<string, { teachers: number; staff: number }>();
    for (const row of teachers) {
      const name = row.department_id ? deptName.get(row.department_id) ?? 'Unassigned' : 'Unassigned';
      const bucket = deptCounts.get(name) ?? { teachers: 0, staff: 0 };
      bucket.teachers += 1;
      deptCounts.set(name, bucket);
    }
    for (const row of staff) {
      const name = row.department?.trim() || 'Unassigned';
      const bucket = deptCounts.get(name) ?? { teachers: 0, staff: 0 };
      bucket.staff += 1;
      deptCounts.set(name, bucket);
    }

    const approvedLeaves = leaves.filter((row) => row.status === 'approved');
    const latestPayroll = payrolls
      .slice()
      .sort((a, b) => String(b.pay_date ?? '').localeCompare(String(a.pay_date ?? '')))[0];

    const now = new Date();
    const monthlyPayroll: { key: string; label: string; net: number }[] = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      monthlyPayroll.push({ key: monthKey(date), label: MONTHS[date.getMonth()], net: 0 });
    }
    const monthIndex = new Map(monthlyPayroll.map((month, index) => [month.key, index]));
    for (const payroll of payrolls) {
      const index = monthIndex.get(String(payroll.pay_date ?? '').slice(0, 7));
      if (index !== undefined) monthlyPayroll[index].net += num(payroll.total_net);
    }

    return NextResponse.json({
      summary: {
        teachers: teachers.length,
        staff: staff.length,
        total: teachers.length + staff.length,
        active:
          teachers.filter((row) => (row.status ?? 'active') === 'active').length +
          staff.filter((row) => (row.status ?? 'active') === 'active').length,
        departments: departments.length,
        pendingLeaves: leaves.filter((row) => row.status === 'pending').length,
        approvedLeaves: approvedLeaves.length,
        approvedLeaveDays: approvedLeaves.reduce((sum, row) => sum + daysBetween(row.start_date, row.end_date), 0),
        payrollRuns: payrolls.length,
        latestPayrollNet: num(latestPayroll?.total_net),
        latestPayrollGross: num(latestPayroll?.total_gross),
        latestPayrollEmployees: num(latestPayroll?.employee_count),
      },
      monthlyPayroll,
      leaveBreakdown: ['pending', 'approved', 'rejected', 'cancelled'].map((name) => ({
        name,
        value: leaves.filter((row) => (row.status ?? 'pending') === name).length,
      })),
      departments: [...deptCounts.entries()]
        .map(([name, counts]) => ({ name, ...counts }))
        .sort((a, b) => b.teachers + b.staff - (a.teachers + a.staff)),
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load HR report');
  }
}
