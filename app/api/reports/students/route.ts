import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num } from '@/lib/portal-api';

type StudentRow = {
  class_id: string | null;
  program_id: string | null;
  status: string | null;
  gender: string | null;
  enrollment_date: string | null;
  outstanding_balance: number | null;
  attendance_percentage: number | null;
  average_grade: number | null;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const [studentsRes, classesRes, programsRes] = await Promise.all([
      (() => {
        const query = admin
          .from('students')
          .select(
            'class_id, program_id, status, gender, enrollment_date, outstanding_balance, attendance_percentage, average_grade'
          );
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin.from('classes').select('id, name');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin.from('programs').select('id, name');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
    ]);

    const students = (studentsRes.data ?? []) as StudentRow[];
    const className = new Map(
      ((classesRes.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name])
    );
    const programName = new Map(
      ((programsRes.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name])
    );

    const active = students.filter((row) => (row.status ?? 'active') === 'active');
    const outstanding = students.reduce((sum, row) => sum + Math.max(0, num(row.outstanding_balance)), 0);
    const attendanceRows = students.filter((row) => row.attendance_percentage != null);
    const avgAttendance = attendanceRows.length
      ? attendanceRows.reduce((sum, row) => sum + num(row.attendance_percentage), 0) / attendanceRows.length
      : 0;

    const now = new Date();
    const thisMonth = monthKey(now);
    const monthly: { key: string; label: string; joined: number }[] = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      monthly.push({ key: monthKey(date), label: MONTHS[date.getMonth()], joined: 0 });
    }
    const monthIndex = new Map(monthly.map((month, index) => [month.key, index]));
    for (const row of students) {
      const index = monthIndex.get(String(row.enrollment_date ?? '').slice(0, 7));
      if (index !== undefined) monthly[index].joined += 1;
    }

    const byClass = new Map<string, { students: number; outstanding: number; attendance: number; attendanceCount: number }>();
    for (const row of students) {
      const key = row.class_id ?? 'unassigned';
      const bucket = byClass.get(key) ?? { students: 0, outstanding: 0, attendance: 0, attendanceCount: 0 };
      bucket.students += 1;
      bucket.outstanding += Math.max(0, num(row.outstanding_balance));
      if (row.attendance_percentage != null) {
        bucket.attendance += num(row.attendance_percentage);
        bucket.attendanceCount += 1;
      }
      byClass.set(key, bucket);
    }

    const byProgram = new Map<string, number>();
    for (const row of students) {
      const key = row.program_id ? programName.get(row.program_id) ?? 'Unassigned' : 'Unassigned';
      byProgram.set(key, (byProgram.get(key) ?? 0) + 1);
    }

    return NextResponse.json({
      summary: {
        total: students.length,
        active: active.length,
        graduated: students.filter((row) => row.status === 'graduated').length,
        inactive: students.filter((row) => ['inactive', 'suspended', 'transferred', 'dropped'].includes(row.status ?? '')).length,
        newThisMonth: students.filter((row) => String(row.enrollment_date ?? '').slice(0, 7) === thisMonth).length,
        female: students.filter((row) => (row.gender ?? '').toLowerCase() === 'female').length,
        male: students.filter((row) => (row.gender ?? '').toLowerCase() === 'male').length,
        outstanding,
        avgAttendance: Math.round(avgAttendance * 10) / 10,
        avgGrade:
          Math.round(
            (students.filter((row) => row.average_grade != null).reduce((sum, row) => sum + num(row.average_grade), 0) /
              Math.max(1, students.filter((row) => row.average_grade != null).length)) *
              10
          ) / 10,
      },
      monthly,
      byClass: [...byClass.entries()]
        .map(([id, bucket]) => ({
          id,
          name: id === 'unassigned' ? 'Unassigned' : className.get(id) ?? '—',
          students: bucket.students,
          outstanding: bucket.outstanding,
          attendance: bucket.attendanceCount
            ? Math.round((bucket.attendance / bucket.attendanceCount) * 10) / 10
            : 0,
        }))
        .sort((a, b) => b.students - a.students)
        .slice(0, 10),
      byProgram: [...byProgram.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load student report');
  }
}
