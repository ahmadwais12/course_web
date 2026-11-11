import { NextResponse } from 'next/server';
import { portalsForNav } from '@/lib/portals';
import { num, requirePortalUser, safeRow, safeRows } from '@/lib/portal-api';
import type { PortalTeacherWorkload, PortalTeacherWorkloadClass } from '@/lib/portal-types';

type TeacherRow = {
  id: string;
  employee_code: string | null;
  full_name: string | null;
  workload_hours: number | null;
  max_workload_hours: number | null;
};
type WorkloadRow = {
  full_name: string | null;
  employee_code: string | null;
  total_courses: number | null;
  total_classes: number | null;
  workload_hours: number | null;
  max_workload_hours: number | null;
  workload_percentage: number | null;
};
type ClassRow = { id: string; name: string | null };
type ClassSubjectRow = { class_id: string; subject_id: string | null };
type StudentRow = { id: string; class_id: string | null; attendance_percentage: number | null };
type SlotRow = { class_id: string | null };
type HomeworkRow = { class_id: string | null };
type ExamRow = { class_id: string | null };

export async function GET() {
  const auth = await requirePortalUser((role) => portalsForNav(role).includes('teacher'));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { admin, user } = auth;

  const teacher = await safeRow<TeacherRow>(
    admin
      .from('teachers')
      .select('id, employee_code, full_name, workload_hours, max_workload_hours')
      .eq('profile_id', user.id)
      .limit(1)
      .maybeSingle()
  );
  const teacherIds = [user.id, teacher?.id].filter((value): value is string => Boolean(value));

  const workload = teacher?.employee_code
    ? await safeRow<WorkloadRow>(
        admin
          .from('teacher_workload')
          .select('full_name, employee_code, total_courses, total_classes, workload_hours, max_workload_hours, workload_percentage')
          .eq('employee_code', teacher.employee_code)
          .limit(1)
          .maybeSingle()
      )
    : teacher?.full_name
      ? await safeRow<WorkloadRow>(
          admin
            .from('teacher_workload')
            .select('full_name, employee_code, total_courses, total_classes, workload_hours, max_workload_hours, workload_percentage')
            .eq('full_name', teacher.full_name)
            .limit(1)
            .maybeSingle()
        )
      : null;

  const [ownedClasses, assigned] = await Promise.all([
    safeRows<ClassRow>(admin.from('classes').select('id, name').in('teacher_id', teacherIds)),
    safeRows<ClassSubjectRow>(
      admin
        .from('class_subjects')
        .select('class_id, subject_id')
        .in('teacher_id', teacherIds)
        .eq('is_active', true)
    ),
  ]);

  const classIds = [...new Set([
    ...ownedClasses.map((row) => row.id),
    ...assigned.map((row) => row.class_id),
  ])];

  const empty: PortalTeacherWorkload = {
    employeeCode: teacher?.employee_code ?? null,
    fullName: teacher?.full_name ?? user.name ?? null,
    totalCourses: num(workload?.total_courses),
    totalClasses: num(workload?.total_classes),
    workloadHours: num(workload?.workload_hours ?? teacher?.workload_hours),
    maxWorkloadHours: num(workload?.max_workload_hours ?? teacher?.max_workload_hours),
    percentage: num(workload?.workload_percentage),
    classes: [],
  };

  if (!classIds.length) return NextResponse.json(empty);

  const [classes, students, slots, homeworkRows, examRows] = await Promise.all([
    safeRows<ClassRow>(admin.from('classes').select('id, name').in('id', classIds)),
    safeRows<StudentRow>(
      admin.from('students').select('id, class_id, attendance_percentage').in('class_id', classIds)
    ),
    safeRows<SlotRow>(
      admin
        .from('timetables')
        .select('class_id')
        .in('class_id', classIds)
        .eq('is_active', true)
    ),
    safeRows<HomeworkRow>(admin.from('homework').select('class_id').in('class_id', classIds)),
    safeRows<ExamRow>(admin.from('exams').select('class_id').in('class_id', classIds)),
  ]);

  const classRows: PortalTeacherWorkloadClass[] = classes.map((row) => {
    const classStudents = students.filter((student) => student.class_id === row.id);
    const attendanceAverage = classStudents.length
      ? Math.round(
          classStudents.reduce((sum, student) => sum + num(student.attendance_percentage), 0) /
            classStudents.length
        )
      : 0;
    return {
      classId: row.id,
      className: row.name || 'Class',
      students: classStudents.length,
      subjects: assigned.filter((item) => item.class_id === row.id).length,
      weeklySlots: slots.filter((item) => item.class_id === row.id).length,
      assignments: homeworkRows.filter((item) => item.class_id === row.id).length,
      exams: examRows.filter((item) => item.class_id === row.id).length,
      attendanceAverage,
    };
  });

  const workloadHours = empty.workloadHours || classRows.reduce((sum, row) => sum + row.weeklySlots, 0);
  const maxWorkloadHours = empty.maxWorkloadHours;
  const percentage = empty.percentage || (maxWorkloadHours ? Math.round((workloadHours / maxWorkloadHours) * 100) : 0);

  const data: PortalTeacherWorkload = {
    ...empty,
    totalCourses: empty.totalCourses || new Set(assigned.map((row) => row.subject_id)).size,
    totalClasses: empty.totalClasses || classRows.length,
    workloadHours,
    maxWorkloadHours,
    percentage,
    classes: classRows,
  };

  return NextResponse.json(data);
}
