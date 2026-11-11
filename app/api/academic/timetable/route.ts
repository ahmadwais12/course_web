import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { str } from '@/lib/portal-api';

type TimetableRow = {
  id: string;
  class_id: string | null;
  subject_id: string | null;
  teacher_id: string | null;
  room_id: string | null;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean | null;
};

const MAX_LENGTH = 5 * 60 + 30;

function minutes(value: string | null) {
  if (!value) return null;
  const [h, m] = value.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const lessonQuery = admin
      .from('timetables')
      .select('id, class_id, subject_id, teacher_id, room_id, day_of_week, start_time, end_time, is_active')
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });
    const classQuery = admin.from('classes').select('id, name').order('name');
    const subjectQuery = admin.from('subjects').select('id, name').order('name');
    const roomQuery = admin.from('rooms').select('id, name').order('name');
    const teacherQuery = admin.from('users').select('id, full_name, email, role');
    const [{ data: lessonData, error }, { data: classData }, { data: subjectData }, { data: roomData }, { data: teacherData }] =
      await Promise.all([
        tenantId ? lessonQuery.eq('tenant_id', tenantId) : lessonQuery,
        tenantId ? classQuery.eq('tenant_id', tenantId) : classQuery,
        tenantId ? subjectQuery.eq('tenant_id', tenantId) : subjectQuery,
        tenantId ? roomQuery.eq('tenant_id', tenantId) : roomQuery,
        tenantId ? teacherQuery.eq('tenant_id', tenantId) : teacherQuery,
      ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const classNames = new Map(
      ((classData ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name])
    );
    const subjectNames = new Map(
      ((subjectData ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name])
    );
    const roomNames = new Map(
      ((roomData ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name])
    );
    const teachers = (teacherData ?? []) as {
      id: string;
      full_name: string | null;
      email: string | null;
      role: string | null;
    }[];
    const teacherNames = new Map(
      teachers.map((row) => [row.id, row.full_name || row.email || '—'])
    );

    return NextResponse.json({
      rows: ((lessonData ?? []) as TimetableRow[]).map((row) => ({
        id: row.id,
        classId: row.class_id,
        className: row.class_id ? classNames.get(row.class_id) ?? '—' : '—',
        subjectId: row.subject_id,
        subject: row.subject_id ? subjectNames.get(row.subject_id) ?? '—' : '—',
        teacherId: row.teacher_id,
        teacher: row.teacher_id ? teacherNames.get(row.teacher_id) ?? '—' : '—',
        roomId: row.room_id,
        room: row.room_id ? roomNames.get(row.room_id) ?? '—' : '—',
        day: row.day_of_week ?? 1,
        startTime: row.start_time,
        endTime: row.end_time,
        isActive: row.is_active !== false,
      })),
      classes: [...classNames.entries()].map(([value, label]) => ({ value, label })),
      subjects: [...subjectNames.entries()].map(([value, label]) => ({ value, label })),
      rooms: [...roomNames.entries()].map(([value, label]) => ({ value, label })),
      teachers: teachers
        .filter((row) => !row.role || row.role === 'teacher' || row.role === 'admin')
        .map((row) => ({ value: row.id, label: row.full_name || row.email || '—' })),
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load timetable');
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const day = Number(body.day ?? 1);
    const startTime = String(body.startTime ?? '').slice(0, 5);
    const endTime = String(body.endTime ?? '').slice(0, 5);
    const start = minutes(startTime);
    const end = minutes(endTime);

    if (!Number.isInteger(day) || day < 1 || day > 7) {
      return NextResponse.json({ error: 'Choose a weekday' }, { status: 400 });
    }
    if (start === null || end === null) {
      return NextResponse.json({ error: 'Start and end times are required' }, { status: 400 });
    }
    if (end <= start) {
      return NextResponse.json({ error: 'End time must be after the start time' }, { status: 400 });
    }
    if (end - start > MAX_LENGTH) {
      return NextResponse.json({ error: 'A lesson cannot be longer than 5 hours 30 minutes' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('timetables')
      .insert({
        tenant_id: tenantId,
        class_id: str(body.classId),
        subject_id: str(body.subjectId),
        teacher_id: str(body.teacherId),
        room_id: str(body.roomId),
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: (data as { id: string } | null)?.id ?? null }, { status: 201 });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to add timetable lesson');
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Lesson id is required' }, { status: 400 });

    const remove = admin.from('timetables').delete().eq('id', id);
    const { error } = await (tenantId ? remove.eq('tenant_id', tenantId) : remove);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to delete timetable lesson');
  }
}
