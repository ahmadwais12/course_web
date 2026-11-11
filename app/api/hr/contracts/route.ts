import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num, str } from '@/lib/portal-api';

type StaffRow = {
  id: string;
  full_name: string | null;
  employee_code: string | null;
  designation: string | null;
  department: string | null;
  contract_type: string | null;
  join_date: string | null;
  contract_end_date: string | null;
  salary: number | null;
  status: string | null;
};

type TeacherRow = {
  id: string;
  full_name: string | null;
  employee_code: string | null;
  specialization: string | null;
  department_id: string | null;
  contract_type: string | null;
  join_date: string | null;
  contract_end_date: string | null;
  salary: number | null;
  status: string | null;
};

type DepartmentRow = { id: string; name: string | null };

type ContractRow = {
  id: string;
  kind: 'staff' | 'teacher';
  employeeName: string;
  employeeCode: string | null;
  designation: string;
  department: string | null;
  contractType: string;
  joinDate: string | null;
  contractEndDate: string | null;
  salary: number;
  status: string;
  daysToExpiry: number | null;
  expiryState: 'active' | 'expiring' | 'expired' | 'open';
};

const DAY = 86_400_000;

function daysUntil(date: string | null) {
  if (!date) return null;
  const target = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(target)) return null;
  const today = Date.parse(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  return Math.round((target - today) / DAY);
}

function expiryState(days: number | null): ContractRow['expiryState'] {
  if (days === null) return 'open';
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  return 'active';
}

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const [staffRes, teacherRes, departmentRes] = await Promise.all([
      (() => {
        const query = admin
          .from('staff')
          .select(
            'id, full_name, employee_code, designation, department, contract_type, join_date, contract_end_date, salary, status'
          );
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin
          .from('teachers')
          .select(
            'id, full_name, employee_code, specialization, department_id, contract_type, join_date, contract_end_date, salary, status'
          );
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      admin.from('departments').select('id, name'),
    ]);

    const staff = (staffRes.data ?? []) as StaffRow[];
    const teachers = (teacherRes.data ?? []) as TeacherRow[];
    const departmentById = new Map(
      ((departmentRes.data ?? []) as DepartmentRow[]).map((row) => [row.id, str(row.name) ?? ''])
    );

    const rows: ContractRow[] = [
      ...staff.map((row) => {
        const days = daysUntil(row.contract_end_date);
        return {
          id: row.id,
          kind: 'staff' as const,
          employeeName: str(row.full_name) ?? 'Unnamed employee',
          employeeCode: str(row.employee_code),
          designation: str(row.designation) ?? 'Staff',
          department: str(row.department),
          contractType: str(row.contract_type) ?? 'Permanent',
          joinDate: row.join_date,
          contractEndDate: row.contract_end_date,
          salary: num(row.salary),
          status: str(row.status) ?? 'active',
          daysToExpiry: days,
          expiryState: expiryState(days),
        };
      }),
      ...teachers.map((row) => {
        const days = daysUntil(row.contract_end_date);
        const specialization = str(row.specialization);
        return {
          id: row.id,
          kind: 'teacher' as const,
          employeeName: str(row.full_name) ?? 'Unnamed teacher',
          employeeCode: str(row.employee_code),
          designation: specialization ? `Teacher — ${specialization}` : 'Teacher',
          department: row.department_id ? departmentById.get(row.department_id) ?? null : null,
          contractType: str(row.contract_type) ?? 'Permanent',
          joinDate: row.join_date,
          contractEndDate: row.contract_end_date,
          salary: num(row.salary),
          status: str(row.status) ?? 'active',
          daysToExpiry: days,
          expiryState: expiryState(days),
        };
      }),
    ].sort((a, b) => {
      const rank = { expired: 0, expiring: 1, active: 2, open: 3 } as const;
      return rank[a.expiryState] - rank[b.expiryState] || a.employeeName.localeCompare(b.employeeName);
    });

    return NextResponse.json({
      rows,
      summary: {
        total: rows.length,
        expiring: rows.filter((row) => row.expiryState === 'expiring').length,
        expired: rows.filter((row) => row.expiryState === 'expired').length,
        open: rows.filter((row) => row.expiryState === 'open').length,
      },
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load contracts');
  }
}
