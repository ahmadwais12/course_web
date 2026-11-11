import { NextResponse } from 'next/server';
import { portalsForNav } from '@/lib/portals';
import { requirePortalUser, safeRow, safeRows } from '@/lib/portal-api';
import type { PortalTeacherLeaveRequest } from '@/lib/portal-types';

type TeacherRow = { id: string };
type ClassRow = { id: string; name: string | null };
type ClassSubjectRow = { class_id: string };
type StudentRow = {
  id: string;
  full_name: string | null;
  student_code: string | null;
  class_id: string | null;
};
type LeaveRow = {
  id: string;
  student_id: string | null;
  start_date: string;
  end_date: string | null;
  reason: string | null;
  status: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
};

export async function GET() {
  const auth = await requirePortalUser((role) => portalsForNav(role).includes('teacher'));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { admin, user } = auth;
  const teacher = await safeRow<TeacherRow>(
    admin.from('teachers').select('id').eq('profile_id', user.id).limit(1).maybeSingle()
  );
  const teacherIds = [user.id, teacher?.id].filter((value): value is string => Boolean(value));

  const [ownedClasses, assigned] = await Promise.all([
    safeRows<ClassRow>(admin.from('classes').select('id, name').in('teacher_id', teacherIds)),
    safeRows<ClassSubjectRow>(
      admin
        .from('class_subjects')
        .select('class_id')
        .in('teacher_id', teacherIds)
        .eq('is_active', true)
    ),
  ]);

  const classIds = [...new Set([
    ...ownedClasses.map((row) => row.id),
    ...assigned.map((row) => row.class_id),
  ])];
  if (!classIds.length) return NextResponse.json({ requests: [] });

  const [students, classes] = await Promise.all([
    safeRows<StudentRow>(
      admin
        .from('students')
        .select('id, full_name, student_code, class_id')
        .in('class_id', classIds)
    ),
    safeRows<ClassRow>(admin.from('classes').select('id, name').in('id', classIds)),
  ]);

  const studentIds = students.map((row) => row.id);
  const leaveRows = studentIds.length
    ? await safeRows<LeaveRow>(
        admin
          .from('student_leaves')
          .select('id, student_id, start_date, end_date, reason, status, approved_at, rejection_reason')
          .in('student_id', studentIds)
          .order('start_date', { ascending: false })
          .limit(200)
      )
    : [];

  const studentById = new Map(students.map((row) => [row.id, row]));
  const classById = new Map(classes.map((row) => [row.id, row]));

  const requests: PortalTeacherLeaveRequest[] = leaveRows.map((row) => {
    const student = row.student_id ? studentById.get(row.student_id) : null;
    return {
      id: row.id,
      studentId: row.student_id || '',
      studentName: student?.full_name || 'Student',
      studentCode: student?.student_code ?? null,
      className: student?.class_id ? classById.get(student.class_id)?.name ?? null : null,
      startDate: row.start_date,
      endDate: row.end_date,
      reason: row.reason,
      status: row.status,
      approvedAt: row.approved_at,
      note: row.rejection_reason,
    };
  });

  return NextResponse.json({ requests });
}
