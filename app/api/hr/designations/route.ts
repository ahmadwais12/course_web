import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num, str } from '@/lib/portal-api';

type StaffRow = {
  id: string;
  full_name: string | null;
  employee_code: string | null;
  designation: string | null;
  department: string | null;
  salary: number | null;
  status: string | null;
};

type TeacherRow = {
  id: string;
  full_name: string | null;
  employee_code: string | null;
  specialization: string | null;
  department_id: string | null;
  salary: number | null;
  status: string | null;
};

type DepartmentRow = { id: string; name: string | null };

type DesignationRow = {
  id: string;
  designation: string;
  headcount: number;
  teacherCount: number;
  staffCount: number;
  departments: string[];
  averageSalary: number;
  minSalary: number;
  maxSalary: number;
  activeCount: number;
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unassigned';
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
          .select('id, full_name, employee_code, designation, department, salary, status');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin
          .from('teachers')
          .select('id, full_name, employee_code, specialization, department_id, salary, status');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin.from('departments').select('id, name');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
    ]);

    const staff = (staffRes.data ?? []) as StaffRow[];
    const teachers = (teacherRes.data ?? []) as TeacherRow[];
    const departmentById = new Map(
      ((departmentRes.data ?? []) as DepartmentRow[]).map((row) => [row.id, str(row.name) ?? ''])
    );

    const groups = new Map<string, { designation: string; salaries: number[]; departments: Set<string>; teacherCount: number; staffCount: number; activeCount: number }>();

    const bucket = (designation: string) => {
      const key = slug(designation);
      const entry =
        groups.get(key) ??
        { designation, salaries: [] as number[], departments: new Set<string>(), teacherCount: 0, staffCount: 0, activeCount: 0 };
      groups.set(key, entry);
      return { key, entry };
    };

    for (const row of staff) {
      const designation = str(row.designation) ?? 'Unassigned';
      const { entry } = bucket(designation);
      entry.staffCount += 1;
      if (row.status === 'active') entry.activeCount += 1;
      const salary = num(row.salary);
      if (salary > 0) entry.salaries.push(salary);
      const department = str(row.department);
      if (department) entry.departments.add(department);
    }

    for (const row of teachers) {
      const specialization = str(row.specialization);
      const designation = specialization ? `Teacher — ${specialization}` : 'Teacher';
      const { entry } = bucket(designation);
      entry.teacherCount += 1;
      if (row.status === 'active') entry.activeCount += 1;
      const salary = num(row.salary);
      if (salary > 0) entry.salaries.push(salary);
      const department = row.department_id ? departmentById.get(row.department_id) : null;
      if (department) entry.departments.add(department);
    }

    const rows: DesignationRow[] = [...groups.entries()]
      .map(([id, entry]) => {
        const salaries = entry.salaries;
        const total = salaries.reduce((sum, value) => sum + value, 0);
        return {
          id,
          designation: entry.designation,
          headcount: entry.teacherCount + entry.staffCount,
          teacherCount: entry.teacherCount,
          staffCount: entry.staffCount,
          departments: [...entry.departments].sort(),
          averageSalary: salaries.length ? Math.round(total / salaries.length) : 0,
          minSalary: salaries.length ? Math.min(...salaries) : 0,
          maxSalary: salaries.length ? Math.max(...salaries) : 0,
          activeCount: entry.activeCount,
        };
      })
      .sort((a, b) => b.headcount - a.headcount || a.designation.localeCompare(b.designation));

    const headcount = rows.reduce((sum, row) => sum + row.headcount, 0);
    const weightedSalary = rows.reduce((sum, row) => sum + row.averageSalary * row.headcount, 0);
    const departments = new Set(rows.flatMap((row) => row.departments));

    return NextResponse.json({
      rows,
      summary: {
        designations: rows.length,
        headcount,
        departments: departments.size,
        averageSalary: headcount ? Math.round(weightedSalary / headcount) : 0,
      },
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load designations');
  }
}
