import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { str } from '@/lib/portal-api';

type EnrollmentRow = {
  id: string;
  student_id: string | null;
  class_id: string | null;
  academic_year_id: string | null;
  enrollment_date: string | null;
  status: string | null;
  grade: string | null;
  remarks: string | null;
};

const STATUSES = new Set(['active', 'completed', 'withdrawn', 'suspended']);

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const enrollmentQuery = admin
      .from('student_enrollments')
      .select('id, student_id, class_id, academic_year_id, enrollment_date, status, grade, remarks')
      .order('enrollment_date', { ascending: false });
    const studentQuery = admin.from('students').select('id, student_code, full_name, email').order('full_name');
    const classQuery = admin.from('classes').select('id, name').order('name');
    const yearQuery = admin.from('academic_years').select('id, name').order('start_date', { ascending: false });

    const [{ data: enrollData, error }, { data: studentData }, { data: classData }, { data: yearData }] =
      await Promise.all([
        tenantId ? enrollmentQuery.eq('tenant_id', tenantId) : enrollmentQuery,
        tenantId ? studentQuery.eq('tenant_id', tenantId) : studentQuery,
        tenantId ? classQuery.eq('tenant_id', tenantId) : classQuery,
        tenantId ? yearQuery.eq('tenant_id', tenantId) : yearQuery,
      ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const students = (studentData ?? []) as {
      id: string;
      student_code: string | null;
      full_name: string | null;
      email: string | null;
    }[];
    const studentMap = new Map(students.map((row) => [row.id, row]));
    const classNames = new Map(
      ((classData ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name])
    );
    const yearNames = new Map(
      ((yearData ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name])
    );

    return NextResponse.json({
      rows: ((enrollData ?? []) as EnrollmentRow[]).map((row) => {
        const student = row.student_id ? studentMap.get(row.student_id) : undefined;
        return {
          id: row.id,
          studentId: row.student_id,
          studentName: student?.full_name ?? '—',
          studentCode: student?.student_code ?? '—',
          classId: row.class_id,
          className: row.class_id ? classNames.get(row.class_id) ?? '—' : '—',
          academicYearId: row.academic_year_id,
          academicYear: row.academic_year_id ? yearNames.get(row.academic_year_id) ?? '—' : '—',
          enrollmentDate: row.enrollment_date,
          status: row.status ?? 'active',
          grade: row.grade,
          remarks: row.remarks,
        };
      }),
      students: students.map((row) => ({
        value: row.id,
        label: `${row.full_name || row.email || 'Student'}${row.student_code ? ` · ${row.student_code}` : ''}`,
      })),
      classes: [...classNames.entries()].map(([value, label]) => ({ value, label })),
      academicYears: [...yearNames.entries()].map(([value, label]) => ({ value, label })),
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load enrollment');
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const studentId = str(body.studentId);
    const status = String(body.status ?? 'active');
    const enrollmentDate = String(body.enrollmentDate ?? new Date().toISOString().slice(0, 10)).slice(0, 10);

    if (!studentId) return NextResponse.json({ error: 'Choose a student' }, { status: 400 });
    if (!STATUSES.has(status)) return NextResponse.json({ error: 'Invalid enrollment status' }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(enrollmentDate)) {
      return NextResponse.json({ error: 'Enrollment date is invalid' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('student_enrollments')
      .insert({
        tenant_id: tenantId,
        student_id: studentId,
        class_id: str(body.classId),
        academic_year_id: str(body.academicYearId),
        enrollment_date: enrollmentDate,
        status,
        grade: str(body.grade),
        remarks: str(body.remarks),
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: (data as { id: string } | null)?.id ?? null }, { status: 201 });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to create enrollment');
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const id = str(body.id);
    const status = str(body.status);
    if (!id) return NextResponse.json({ error: 'Enrollment id is required' }, { status: 400 });
    if (!status || !STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid enrollment status' }, { status: 400 });
    }

    const update = admin
      .from('student_enrollments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    const { error } = await (tenantId ? update.eq('tenant_id', tenantId) : update);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to update enrollment');
  }
}
