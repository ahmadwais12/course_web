import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num, str } from '@/lib/portal-api';

type TeacherRow = {
  id: string;
  profile_id: string | null;
  employee_code: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  department_id: string | null;
  qualification: string | null;
  specialization: string | null;
  experience_years: number | null;
  join_date: string | null;
  status: string | null;
  workload_hours: number | null;
};

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  department: string | null;
  status: string | null;
};

type LinkRow = { teacher_id: string | null; subject_id: string | null };

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const teacherQuery = admin
      .from('teachers')
      .select(
        'id, profile_id, employee_code, full_name, email, phone, department_id, qualification, specialization, experience_years, join_date, status, workload_hours'
      )
      .order('full_name', { ascending: true });
    const userQuery = admin
      .from('users')
      .select('id, full_name, email, phone, role, department, status')
      .eq('role', 'teacher');
    const deptQuery = admin.from('departments').select('id, name');
    const linkQuery = admin.from('class_subjects').select('teacher_id, subject_id');
    const classQuery = admin.from('classes').select('id, teacher_id');

    const [
      { data: teacherData, error },
      { data: userData },
      { data: deptData },
      { data: linkData },
      { data: classData },
    ] = await Promise.all([
      tenantId ? teacherQuery.eq('tenant_id', tenantId) : teacherQuery,
      tenantId ? userQuery.eq('tenant_id', tenantId) : userQuery,
      tenantId ? deptQuery.eq('tenant_id', tenantId) : deptQuery,
      tenantId ? linkQuery.eq('tenant_id', tenantId) : linkQuery,
      tenantId ? classQuery.eq('tenant_id', tenantId) : classQuery,
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const deptNames = new Map(
      ((deptData ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name])
    );

    const subjectCount = new Map<string, Set<string>>();
    for (const row of (linkData ?? []) as LinkRow[]) {
      if (!row.teacher_id) continue;
      const set = subjectCount.get(row.teacher_id) ?? new Set<string>();
      if (row.subject_id) set.add(row.subject_id);
      subjectCount.set(row.teacher_id, set);
    }
    const classCount = new Map<string, number>();
    for (const row of (classData ?? []) as { id: string; teacher_id: string | null }[]) {
      if (row.teacher_id) classCount.set(row.teacher_id, (classCount.get(row.teacher_id) ?? 0) + 1);
    }

    const teachers = (teacherData ?? []) as TeacherRow[];
    const linkedProfiles = new Set(teachers.map((row) => row.profile_id).filter(Boolean) as string[]);
    const users = ((userData ?? []) as UserRow[]).filter((row) => !linkedProfiles.has(row.id));

    const rows = [
      ...teachers.map((row) => ({
        id: row.id,
        profileId: row.profile_id,
        code: str(row.employee_code) ?? '—',
        name: row.full_name || row.email || '—',
        email: row.email,
        phone: row.phone,
        department: row.department_id ? deptNames.get(row.department_id) ?? '—' : '—',
        qualification: row.qualification,
        specialization: row.specialization,
        experienceYears: num(row.experience_years),
        joinDate: row.join_date,
        status: row.status ?? 'active',
        workloadHours: num(row.workload_hours),
        subjects: subjectCount.get(row.id)?.size ?? 0,
        classes: classCount.get(row.id) ?? 0,
        source: 'teacher_profile' as const,
      })),
      ...users.map((row) => ({
        id: row.id,
        profileId: row.id,
        code: '—',
        name: row.full_name || row.email || '—',
        email: row.email,
        phone: row.phone,
        department: row.department ?? '—',
        qualification: null,
        specialization: null,
        experienceYears: 0,
        joinDate: null,
        status: row.status ?? 'active',
        workloadHours: 0,
        subjects: subjectCount.get(row.id)?.size ?? 0,
        classes: classCount.get(row.id) ?? 0,
        source: 'user_profile' as const,
      })),
    ].sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ rows });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load teachers');
  }
}
