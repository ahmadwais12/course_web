import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';

type AttendanceRow = {
  student_id: string | null;
  class_id: string | null;
  date: string | null;
  status: string | null;
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

    const [attendanceRes, classesRes, studentsRes] = await Promise.all([
      admin.from('student_attendance').select('student_id, class_id, date, status'),
      (() => {
        const query = admin.from('classes').select('id, name');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin.from('students').select('id');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
    ]);

    const allowedStudents = new Set(
      ((studentsRes.data ?? []) as { id: string }[]).map((row) => row.id)
    );
    const rows = ((attendanceRes.data ?? []) as AttendanceRow[]).filter(
      (row) => !tenantId || (row.student_id && allowedStudents.has(row.student_id))
    );
    const classes = (classesRes.data ?? []) as { id: string; name: string }[];
    const className = new Map(classes.map((row) => [row.id, row.name]));

    const normalize = (status: string | null) => (status ?? 'Present').toLowerCase();
    const counts = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const row of rows) {
      const status = normalize(row.status);
      if (status === 'present') counts.present += 1;
      else if (status === 'absent') counts.absent += 1;
      else if (status === 'late') counts.late += 1;
      else if (status === 'excused') counts.excused += 1;
    }
    const total = rows.length;
    const presentRate = total ? Math.round(((counts.present + counts.late) / total) * 1000) / 10 : 0;

    const now = new Date();
    const monthly: { key: string; label: string; present: number; absent: number; late: number }[] = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      monthly.push({ key: monthKey(date), label: MONTHS[date.getMonth()], present: 0, absent: 0, late: 0 });
    }
    const monthIndex = new Map(monthly.map((month, index) => [month.key, index]));
    for (const row of rows) {
      const index = monthIndex.get(String(row.date ?? '').slice(0, 7));
      if (index === undefined) continue;
      const status = normalize(row.status);
      if (status === 'present') monthly[index].present += 1;
      else if (status === 'absent') monthly[index].absent += 1;
      else if (status === 'late') monthly[index].late += 1;
    }

    const byClass = new Map<string, { present: number; total: number; absent: number }>();
    for (const row of rows) {
      const key = row.class_id ?? 'unassigned';
      const bucket = byClass.get(key) ?? { present: 0, total: 0, absent: 0 };
      bucket.total += 1;
      const status = normalize(row.status);
      if (status === 'present' || status === 'late') bucket.present += 1;
      if (status === 'absent') bucket.absent += 1;
      byClass.set(key, bucket);
    }
    const classBreakdown = [...byClass.entries()]
      .map(([id, bucket]) => ({
        id,
        name: id === 'unassigned' ? 'Unassigned' : className.get(id) ?? '—',
        rate: bucket.total ? Math.round((bucket.present / bucket.total) * 1000) / 10 : 0,
        absent: bucket.absent,
        records: bucket.total,
      }))
      .sort((a, b) => b.records - a.records)
      .slice(0, 10);

    const today = now.toISOString().slice(0, 10);
    const todayRows = rows.filter((row) => String(row.date ?? '').slice(0, 10) === today);
    const todayPresent = todayRows.filter((row) => {
      const status = normalize(row.status);
      return status === 'present' || status === 'late';
    }).length;

    return NextResponse.json({
      summary: {
        records: total,
        presentRate,
        absent: counts.absent,
        late: counts.late,
        excused: counts.excused,
        todayTotal: todayRows.length,
        todayPresent,
        classesTracked: byClass.size,
      },
      monthly,
      classBreakdown,
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load attendance report');
  }
}
