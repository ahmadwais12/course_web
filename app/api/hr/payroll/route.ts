import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { jsonNumberMap, num, str } from '@/lib/portal-api';

type SalaryRow = {
  id: string;
  employee_id: string | null;
  employee_type: string | null;
  month: number | null;
  year: number | null;
  basic_salary: number | null;
  allowances: unknown;
  deductions: unknown;
  bonus: number | null;
  overtime_hours: number | null;
  overtime_pay: number | null;
  gross_salary: number | null;
  net_salary: number | null;
  payment_date: string | null;
  payment_method: string | null;
  status: string | null;
};

type PayrollRunRow = {
  id: string;
  name: string | null;
  payroll_period: string | null;
  period_start: string | null;
  period_end: string | null;
  pay_date: string | null;
  status: string | null;
  employee_count: number | null;
  total_net: number | null;
};

type StaffRow = { id: string; profile_id: string | null; full_name: string | null; employee_code: string | null };
type TeacherRow = { id: string; profile_id: string | null; full_name: string | null; employee_code: string | null };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const [salaryRes, runRes, staffRes, teacherRes] = await Promise.all([
      (() => {
        const query = admin
          .from('salaries')
          .select(
            'id, employee_id, employee_type, month, year, basic_salary, allowances, deductions, bonus, overtime_hours, overtime_pay, gross_salary, net_salary, payment_date, payment_method, status'
          )
          .order('year', { ascending: false })
          .order('month', { ascending: false });
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin
          .from('payroll')
          .select(
            'id, name, payroll_period, period_start, period_end, pay_date, status, employee_count, total_net'
          )
          .order('pay_date', { ascending: false });
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      admin.from('staff').select('id, profile_id, full_name, employee_code'),
      admin.from('teachers').select('id, profile_id, full_name, employee_code'),
    ]);

    const salaries = (salaryRes.data ?? []) as SalaryRow[];
    const runs = ((runRes.data ?? []) as PayrollRunRow[]).map((row) => ({
      id: row.id,
      name: str(row.name) ?? str(row.payroll_period) ?? 'Payroll run',
      payrollPeriod: str(row.payroll_period),
      periodStart: row.period_start,
      periodEnd: row.period_end,
      payDate: row.pay_date,
      status: str(row.status) ?? 'pending',
      employeeCount: num(row.employee_count),
      totalNet: num(row.total_net),
    }));

    const employeeById = new Map<string, { name: string; code: string | null; type: string }>();
    for (const row of (staffRes.data ?? []) as StaffRow[]) {
      const entry = { name: str(row.full_name) ?? 'Unnamed employee', code: str(row.employee_code), type: 'Staff' };
      employeeById.set(row.id, entry);
      if (row.profile_id) employeeById.set(row.profile_id, entry);
    }
    for (const row of (teacherRes.data ?? []) as TeacherRow[]) {
      const entry = { name: str(row.full_name) ?? 'Unnamed teacher', code: str(row.employee_code), type: 'Teacher' };
      employeeById.set(row.id, entry);
      if (row.profile_id) employeeById.set(row.profile_id, entry);
    }

    const rows = salaries.map((row) => {
      const employee = row.employee_id ? employeeById.get(row.employee_id) : undefined;
      const allowances = jsonNumberMap(row.allowances);
      const deductions = jsonNumberMap(row.deductions);
      const month = clampMonth(row.month);
      const year = num(row.year);
      return {
        id: row.id,
        employeeId: row.employee_id,
        employeeName: employee?.name ?? 'Unknown employee',
        employeeCode: employee?.code ?? null,
        employeeType: str(row.employee_type) ?? employee?.type ?? 'Staff',
        month,
        year,
        period: month && year ? `${MONTHS[month - 1]} ${year}` : '—',
        periodKey: month && year ? `${year}-${String(month).padStart(2, '0')}` : '',
        basicSalary: num(row.basic_salary),
        allowances: Object.values(allowances).reduce((sum, value) => sum + value, 0),
        deductions: Object.values(deductions).reduce((sum, value) => sum + value, 0),
        bonus: num(row.bonus),
        overtimeHours: num(row.overtime_hours),
        overtimePay: num(row.overtime_pay),
        grossSalary: num(row.gross_salary),
        netSalary: num(row.net_salary),
        paymentDate: row.payment_date,
        paymentMethod: str(row.payment_method),
        status: str(row.status) ?? 'pending',
      };
    });

    const periods = [...new Set(rows.map((row) => row.periodKey).filter(Boolean))].sort((a, b) =>
      b.localeCompare(a)
    );
    const currentPeriod = periods[0] ?? '';
    const currentRows = rows.filter((row) => row.periodKey === currentPeriod);

    return NextResponse.json({
      rows,
      runs,
      periods,
      summary: {
        currentPeriod,
        currentPeriodLabel: currentRows[0]?.period ?? '—',
        netPayroll: currentRows.reduce((sum, row) => sum + row.netSalary, 0),
        headcount: new Set(rows.map((row) => row.employeeId).filter(Boolean)).size,
        pending: rows.filter((row) => row.status === 'pending').length,
        paid: rows.filter((row) => row.status === 'paid').length,
        totalPaid: rows
          .filter((row) => row.status === 'paid')
          .reduce((sum, row) => sum + row.netSalary, 0),
      },
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load payroll');
  }
}

function clampMonth(value: unknown) {
  const month = num(value);
  return month >= 1 && month <= 12 ? month : 0;
}
