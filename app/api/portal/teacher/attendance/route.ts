import { NextResponse } from 'next/server';
import { requirePortalUser, safeRow, safeRows } from '@/lib/portal-api';

type ClassRow = { id: string; tenant_id: string | null; teacher_id: string | null };
type ClassSubjectRow = { class_id: string };
type StudentRow = { id: string; class_id: string | null; tenant_id: string | null };
type AttendanceRow = { id: string; person_id: string };

const STATUSES = new Set(['present', 'absent', 'late', 'excused']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  const auth = await requirePortalUser((role) => role === 'teacher');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { admin, user } = auth;

  try {
    const body = (await request.json()) as {
      classId?: string;
      date?: string;
      records?: { studentId?: string; status?: string; remarks?: string }[];
    };

    const classId = String(body.classId ?? '').trim();
    const date = String(body.date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const records = Array.isArray(body.records) ? body.records : [];

    if (!classId) {
      return NextResponse.json({ error: 'classId is required' }, { status: 400 });
    }
    if (!DATE_RE.test(date)) {
      return NextResponse.json({ error: 'A valid attendance date is required' }, { status: 400 });
    }
    if (date > new Date().toISOString().slice(0, 10)) {
      return NextResponse.json({ error: 'Future dates cannot be marked' }, { status: 400 });
    }
    if (!records.length) {
      return NextResponse.json({ error: 'No attendance records were submitted' }, { status: 400 });
    }
    if (records.some((row) => !row.studentId || !row.status || !STATUSES.has(row.status))) {
      return NextResponse.json(
        { error: 'Each record needs a studentId and a valid status' },
        { status: 400 }
      );
    }

    const teacher = await safeRow<{ id: string }>(
      admin.from('teachers').select('id').eq('profile_id', user.id).limit(1).maybeSingle()
    );
    const teacherIds = [user.id, teacher?.id].filter((value): value is string => Boolean(value));

    const [ownedClass, assignedClass] = await Promise.all([
      safeRow<ClassRow>(
        admin
          .from('classes')
          .select('id, tenant_id, teacher_id')
          .eq('id', classId)
          .in('teacher_id', teacherIds)
          .maybeSingle()
      ),
      safeRow<ClassSubjectRow>(
        admin
          .from('class_subjects')
          .select('class_id')
          .eq('class_id', classId)
          .in('teacher_id', teacherIds)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
      ),
    ]);

    if (!ownedClass && !assignedClass) {
      return NextResponse.json(
        { error: 'You are not assigned to this class' },
        { status: 403 }
      );
    }

    const classInfo = ownedClass ?? (await safeRow<ClassRow>(
      admin.from('classes').select('id, tenant_id, teacher_id').eq('id', classId).maybeSingle()
    ));

    const students = await safeRows<StudentRow>(
      admin.from('students').select('id, class_id, tenant_id').eq('class_id', classId)
    );
    const studentById = new Map(students.map((row) => [row.id, row]));

    const invalid = records.find((row) => !studentById.has(String(row.studentId)));
    if (invalid) {
      return NextResponse.json(
        { error: 'One or more students are not enrolled in this class' },
        { status: 400 }
      );
    }

    const studentIds = [...new Set(records.map((row) => String(row.studentId)))];
    const existing = await safeRows<AttendanceRow>(
      admin
        .from('attendance')
        .select('id, person_id')
        .eq('person_type', 'student')
        .eq('date', date)
        .in('person_id', studentIds)
    );
    const existingByPerson = new Map(existing.map((row) => [row.person_id, row.id]));

    let inserted = 0;
    let updated = 0;
    let failed = 0;

    for (const record of records) {
      const studentId = String(record.studentId);
      const payload = {
        tenant_id: studentById.get(studentId)?.tenant_id ?? classInfo?.tenant_id ?? user.tenantId,
        person_id: studentId,
        person_type: 'student',
        date,
        status: record.status,
        remarks: record.remarks?.trim() || null,
        marked_by: user.id,
        updated_at: new Date().toISOString(),
      };

      const existingId = existingByPerson.get(studentId);
      if (existingId) {
        const { error } = await admin.from('attendance').update(payload).eq('id', existingId);
        if (error) failed += 1;
        else updated += 1;
      } else {
        const { error } = await admin.from('attendance').insert(payload);
        if (error) failed += 1;
        else inserted += 1;
      }
    }

    if (!inserted && !updated) {
      return NextResponse.json(
        { error: 'Attendance could not be saved. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, inserted, updated, failed, date, classId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save attendance';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
