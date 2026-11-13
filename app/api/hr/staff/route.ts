import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num, str } from '@/lib/portal-api';
import {
  buildEmployeeValues,
  employeeKind,
  friendlyEmployeeError,
  generatedEmployeeCode,
} from '@/lib/hr-employee';

type StaffRow = {
  id: string;
  full_name: string | null;
  employee_code: string | null;
  email: string | null;
  phone: string | null;
  designation: string | null;
  department: string | null;
  salary: number | null;
  status: string | null;
  join_date: string | null;
  contract_type: string | null;
};

type TeacherRow = {
  id: string;
  full_name: string | null;
  employee_code: string | null;
  email: string | null;
  phone: string | null;
  specialization: string | null;
  department_id: string | null;
  salary: number | null;
  status: string | null;
  join_date: string | null;
  contract_type: string | null;
};

type DepartmentRow = { id: string; name: string | null };

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
            'id, full_name, employee_code, email, phone, designation, department, salary, status, join_date, contract_type'
          )
          .order('join_date', { ascending: false });
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin
          .from('teachers')
          .select(
            'id, full_name, employee_code, email, phone, specialization, department_id, salary, status, join_date, contract_type'
          )
          .order('join_date', { ascending: false });
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin.from('departments').select('id, name').order('name');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
    ]);

    if (staffRes.error) return NextResponse.json({ error: staffRes.error.message }, { status: 500 });
    if (teacherRes.error) {
      return NextResponse.json({ error: teacherRes.error.message }, { status: 500 });
    }

    const departmentById = new Map(
      ((departmentRes.data ?? []) as DepartmentRow[]).map((row) => [row.id, str(row.name) ?? ''])
    );

    const rows = [
      ...((staffRes.data ?? []) as StaffRow[]).map((row) => ({
        id: `staff:${row.id}`,
        recordId: row.id,
        kind: 'staff' as const,
        name: str(row.full_name) ?? 'Unnamed employee',
        code: str(row.employee_code),
        role: str(row.designation) ?? 'Staff',
        designation: str(row.designation),
        department: str(row.department),
        departmentId: null as string | null,
        email: str(row.email),
        phone: str(row.phone),
        salary: num(row.salary),
        status: str(row.status) ?? 'active',
        joinDate: row.join_date,
        contractType: str(row.contract_type) ?? 'contract',
        specialization: null as string | null,
      })),
      ...((teacherRes.data ?? []) as TeacherRow[]).map((row) => {
        const specialization = str(row.specialization);
        return {
          id: `teacher:${row.id}`,
          recordId: row.id,
          kind: 'teacher' as const,
          name: str(row.full_name) ?? 'Unnamed teacher',
          code: str(row.employee_code),
          role: specialization ? `Teacher — ${specialization}` : 'Teacher',
          designation: null as string | null,
          department: row.department_id ? departmentById.get(row.department_id) ?? null : null,
          departmentId: row.department_id,
          email: str(row.email),
          phone: str(row.phone),
          salary: num(row.salary),
          status: str(row.status) ?? 'active',
          joinDate: row.join_date,
          contractType: str(row.contract_type) ?? 'contract',
          specialization,
        };
      }),
    ].sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      rows,
      summary: {
        total: rows.length,
        active: rows.filter((row) => row.status === 'active').length,
        teachers: rows.filter((row) => row.kind === 'teacher').length,
        staff: rows.filter((row) => row.kind === 'staff').length,
        monthlySalary: rows
          .filter((row) => row.status === 'active')
          .reduce((sum, row) => sum + row.salary, 0),
      },
      departments: ((departmentRes.data ?? []) as DepartmentRow[]).map((row) => ({
        id: row.id,
        name: str(row.name) ?? 'Unnamed department',
      })),
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load staff directory');
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

    const kind = employeeKind(body.kind);
    if (!kind) {
      return NextResponse.json({ error: 'Choose employee type: staff or teacher' }, { status: 400 });
    }

    const result = buildEmployeeValues(body, kind, true);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    const values = { ...result.values };
    if (!values.employee_code) values.employee_code = generatedEmployeeCode(kind);
    if (tenantId) values.tenant_id = tenantId;

    const { data, error } = await admin.from(kind).insert(values).select('id').single();
    if (error) {
      return NextResponse.json(
        { error: friendlyEmployeeError(error.message, error.code) },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, id: (data as { id: string }).id }, { status: 201 });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to create employee');
  }
}
