import { NextResponse } from 'next/server';
import { portalsForNav } from '@/lib/portals';
import {
  attendanceSummary,
  monthlyAttendance,
  num,
  requirePortalUser,
  safeRow,
  safeRows,
  type AttendanceRow,
} from '@/lib/portal-api';
import type {
  PortalExam,
  PortalMaterial,
  PortalSubject,
  PortalTeacherClass,
  PortalTeacherData,
  PortalTeacherStudent,
  PortalTeacherSubmission,
  PortalTimetableSlot,
} from '@/lib/portal-types';

type TeacherRow = {
  id: string;
  employee_code: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  department_id: string | null;
  qualification: string | null;
  specialization: string | null;
  join_date: string | null;
  status: string | null;
  photo_url: string | null;
};
type DepartmentRow = { id: string; name: string | null };
type ClassRow = {
  id: string;
  name: string | null;
  grade: string | null;
  teacher_id: string | null;
};
type ClassSubjectRow = {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
};
type SubjectRow = { id: string; name: string; code: string };
type UserRow = { id: string; full_name: string | null };
type StudentRow = {
  id: string;
  student_code: string | null;
  full_name: string | null;
  class_id: string | null;
  attendance_percentage: number | null;
  average_grade: number | null;
  status: string | null;
  photo_url: string | null;
};
type TimetableRow = {
  id: string;
  class_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject_id: string | null;
  teacher_id: string | null;
  room_id: string | null;
};
type RoomRow = { id: string; name: string };
type HomeworkRow = {
  id: string;
  title: string;
  description: string | null;
  class_id: string | null;
  subject_id: string | null;
  assigned_date: string | null;
  due_date: string | null;
  max_marks: number | null;
  attachment_url: string | null;
  status: string | null;
};
type SubmissionRow = {
  id: string;
  homework_id: string;
  student_id: string;
  submitted_at: string | null;
  marks_obtained: number | null;
  feedback: string | null;
  status: string | null;
  submission_url: string | null;
};
type ExamRow = {
  id: string;
  name: string;
  exam_type: string | null;
  subject: string | null;
  class_id: string | null;
  exam_date: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  total_marks: number | null;
  passing_marks: number | null;
  status: string | null;
};
type LessonPlanRow = {
  id: string;
  class_id: string | null;
  subject_id: string | null;
  title: string;
  objectives: string | null;
  materials: string | null;
  activities: unknown;
  assessment: string | null;
  lesson_date: string | null;
  duration_minutes: number | null;
  status: string | null;
};

export async function GET() {
  const auth = await requirePortalUser((role) => portalsForNav(role).includes('teacher'));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { admin, user } = auth;
  const profile = {
    id: user.id,
    name: user.name || user.email || 'Teacher',
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
    tenantId: user.tenantId,
  };

  const teacher = await safeRow<TeacherRow>(
    admin
      .from('teachers')
      .select('id, employee_code, full_name, email, phone, department_id, qualification, specialization, join_date, status, photo_url')
      .eq('profile_id', user.id)
      .limit(1)
      .maybeSingle()
  );
  const department = teacher?.department_id
    ? await safeRow<DepartmentRow>(
        admin.from('departments').select('id, name').eq('id', teacher.department_id).maybeSingle()
      )
    : null;

  const teacherIds = [user.id, teacher?.id].filter((value): value is string => Boolean(value));

  const [ownedClasses, ownedAssignments] = await Promise.all([
    safeRows<ClassRow>(
      admin.from('classes').select('id, name, grade, teacher_id').in('teacher_id', teacherIds)
    ),
    safeRows<ClassSubjectRow>(
      admin
        .from('class_subjects')
        .select('id, class_id, subject_id, teacher_id')
        .in('teacher_id', teacherIds)
        .eq('is_active', true)
    ),
  ]);

  const classIds = [...new Set([
    ...ownedClasses.map((row) => row.id),
    ...ownedAssignments.map((row) => row.class_id),
  ])];

  if (!classIds.length) {
    const empty: PortalTeacherData = {
      portal: 'teacher',
      profile,
      teacher: teacher
        ? {
            id: teacher.id,
            employeeCode: teacher.employee_code || '—',
            fullName: teacher.full_name || profile.name,
            email: teacher.email,
            phone: teacher.phone,
            departmentName: department?.name ?? null,
            qualification: teacher.qualification,
            specialization: teacher.specialization,
            joinDate: teacher.join_date,
            status: teacher.status,
            photoUrl: teacher.photo_url,
          }
        : null,
      classes: [],
      students: [],
      subjects: [],
      timetable: [],
      attendance: {
        summary: attendanceSummary([]),
        recent: [],
        monthly: [],
        todayDone: 0,
        pendingClasses: [],
      },
      assignments: [],
      submissions: [],
      exams: [],
      materials: [],
      stats: { classes: 0, students: 0, subjects: 0, pendingReview: 0 },
    };
    return NextResponse.json(empty);
  }

  const [classRecords, classSubjectRows, studentRows, timetableRows] = await Promise.all([
    safeRows<ClassRow>(
      admin.from('classes').select('id, name, grade, teacher_id').in('id', classIds)
    ),
    safeRows<ClassSubjectRow>(
      admin
        .from('class_subjects')
        .select('id, class_id, subject_id, teacher_id')
        .in('class_id', classIds)
        .eq('is_active', true)
    ),
    safeRows<StudentRow>(
      admin
        .from('students')
        .select('id, student_code, full_name, class_id, attendance_percentage, average_grade, status, photo_url')
        .in('class_id', classIds)
        .order('full_name')
    ),
    safeRows<TimetableRow>(
      admin
        .from('timetables')
        .select('id, class_id, day_of_week, start_time, end_time, subject_id, teacher_id, room_id')
        .in('class_id', classIds)
        .eq('is_active', true)
        .order('day_of_week')
    ),
  ]);

  const classById = new Map(classRecords.map((row) => [row.id, row]));
  const studentIds = studentRows.map((row) => row.id);

  const subjectIds = [...new Set(classSubjectRows.map((row) => row.subject_id))];
  const teacherUserIds = [...new Set([
    ...classSubjectRows.map((row) => row.teacher_id),
    ...timetableRows.map((row) => row.teacher_id),
  ].filter((value): value is string => Boolean(value)))];
  const roomIds = [...new Set(
    timetableRows.map((row) => row.room_id).filter((value): value is string => Boolean(value))
  )];

  const today = new Date().toISOString().slice(0, 10);

  const [subjectRecords, teacherUsers, roomRecords, homeworkRows, attendanceRows, todayRows, examRows, lessonPlanRows] =
    await Promise.all([
      subjectIds.length
        ? safeRows<SubjectRow>(admin.from('subjects').select('id, name, code').in('id', subjectIds))
        : Promise.resolve([]),
      teacherUserIds.length
        ? safeRows<UserRow>(admin.from('users').select('id, full_name').in('id', teacherUserIds))
        : Promise.resolve([]),
      roomIds.length
        ? safeRows<RoomRow>(admin.from('rooms').select('id, name').in('id', roomIds))
        : Promise.resolve([]),
      safeRows<HomeworkRow>(
        admin
          .from('homework')
          .select('id, title, description, class_id, subject_id, assigned_date, due_date, max_marks, attachment_url, status')
          .in('class_id', classIds)
          .order('due_date', { ascending: false })
          .limit(200)
      ),
      studentIds.length
        ? safeRows<AttendanceRow>(
            admin
              .from('attendance')
              .select('id, person_id, date, status, check_in_time, check_out_time, late_minutes, remarks')
              .eq('person_type', 'student')
              .in('person_id', studentIds)
              .order('date', { ascending: false })
              .limit(1500)
          )
        : Promise.resolve([]),
      studentIds.length
        ? safeRows<AttendanceRow>(
            admin
              .from('attendance')
              .select('id, person_id, date, status, check_in_time, check_out_time, late_minutes, remarks')
              .eq('person_type', 'student')
              .eq('date', today)
              .in('person_id', studentIds)
              .limit(1000)
          )
        : Promise.resolve([]),
      safeRows<ExamRow>(
        admin
          .from('exams')
          .select('id, name, exam_type, subject, class_id, exam_date, start_time, end_time, duration_minutes, total_marks, passing_marks, status')
          .in('class_id', classIds)
          .order('exam_date', { ascending: false })
          .limit(120)
      ),
      safeRows<LessonPlanRow>(
        admin
          .from('lesson_plans')
          .select('id, class_id, subject_id, title, objectives, materials, activities, assessment, lesson_date, duration_minutes, status')
          .in('teacher_id', teacherIds)
          .order('lesson_date', { ascending: false })
          .limit(150)
      ),
    ]);

  const homeworkIds = homeworkRows.map((row) => row.id);
  const submissionRows = homeworkIds.length
    ? await safeRows<SubmissionRow>(
        admin
          .from('homework_submissions')
          .select('id, homework_id, student_id, submitted_at, marks_obtained, feedback, status, submission_url')
          .in('homework_id', homeworkIds)
          .order('submitted_at', { ascending: false })
          .limit(1000)
      )
    : [];

  const subjectById = new Map(subjectRecords.map((row) => [row.id, row]));
  const teacherNameById = new Map(teacherUsers.map((row) => [row.id, row.full_name]));
  const roomById = new Map(roomRecords.map((row) => [row.id, row.name]));
  const studentById = new Map(studentRows.map((row) => [row.id, row]));
  const homeworkById = new Map(homeworkRows.map((row) => [row.id, row]));
  const todayPersonIds = new Set(todayRows.map((row) => row.person_id));

  const classes: PortalTeacherClass[] = classRecords.map((row) => ({
    id: row.id,
    name: row.name || 'Class',
    grade: row.grade,
    studentCount: studentRows.filter((student) => student.class_id === row.id).length,
    isClassTeacher: teacherIds.includes(row.teacher_id ?? ''),
    subjects: classSubjectRows
      .filter((assignment) => assignment.class_id === row.id)
      .map((assignment) => {
        const subject = subjectById.get(assignment.subject_id);
        return subject ? { id: subject.id, name: subject.name, code: subject.code } : null;
      })
      .filter((subject): subject is { id: string; name: string; code: string } => Boolean(subject)),
  }));

  const students: PortalTeacherStudent[] = studentRows.map((row) => ({
    id: row.id,
    studentCode: row.student_code || '—',
    fullName: row.full_name || 'Student',
    className: row.class_id ? classById.get(row.class_id)?.name ?? null : null,
    classId: row.class_id,
    attendancePercentage: num(row.attendance_percentage),
    averageGrade: num(row.average_grade),
    status: row.status,
    photoUrl: row.photo_url,
  }));

  const subjects: (PortalSubject & { classId: string | null })[] = classSubjectRows
    .map((assignment): (PortalSubject & { classId: string | null }) | null => {
      const subject = subjectById.get(assignment.subject_id);
      if (!subject) return null;
      return {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        teacherName: assignment.teacher_id
          ? teacherNameById.get(assignment.teacher_id) ?? null
          : null,
        className: assignment.class_id ? classById.get(assignment.class_id)?.name ?? null : null,
        classId: assignment.class_id,
      };
    })
    .filter((row): row is PortalSubject & { classId: string | null } => Boolean(row));

  const timetable: PortalTimetableSlot[] = timetableRows.map((row) => ({
    id: row.id,
    dayOfWeek: Number(row.day_of_week),
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    subjectName: row.subject_id ? subjectById.get(row.subject_id)?.name ?? null : null,
    className: row.class_id ? classById.get(row.class_id)?.name ?? null : null,
    teacherName: row.teacher_id ? teacherNameById.get(row.teacher_id) ?? null : null,
    roomName: row.room_id ? roomById.get(row.room_id) ?? null : null,
  }));

  const submissions: PortalTeacherSubmission[] = submissionRows.map((row) => {
    const homework = homeworkById.get(row.homework_id);
    return {
      id: row.id,
      homeworkId: row.homework_id,
      homeworkTitle: homework?.title ?? 'Assignment',
      className: homework?.class_id ? classById.get(homework.class_id)?.name ?? null : null,
      studentName: studentById.get(row.student_id)?.full_name ?? 'Student',
      submittedAt: row.submitted_at,
      status: row.status,
      marksObtained: row.marks_obtained == null ? null : num(row.marks_obtained),
      feedback: row.feedback,
      submissionUrl: row.submission_url,
    };
  });

  const assignments = homeworkRows.map((row) => {
    const homeworkSubmissions = submissionRows.filter((submission) => submission.homework_id === row.id);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      subjectName: row.subject_id ? subjectById.get(row.subject_id)?.name ?? null : null,
      className: row.class_id ? classById.get(row.class_id)?.name ?? null : null,
      assignedDate: row.assigned_date,
      dueDate: row.due_date,
      maxMarks: row.max_marks == null ? null : num(row.max_marks),
      attachmentUrl: row.attachment_url,
      status: row.status,
      submissionStatus: null,
      submittedAt: null,
      marksObtained: null,
      feedback: null,
      submissionCount: homeworkSubmissions.length,
      pendingReview: homeworkSubmissions.filter(
        (submission) => submission.status === 'submitted' || submission.status === 'late'
      ).length,
    };
  });

  const exams: PortalExam[] = examRows.map((row) => ({
    id: row.id,
    name: row.name,
    examType: row.exam_type,
    subject: row.subject,
    className: row.class_id ? classById.get(row.class_id)?.name ?? null : null,
    examDate: row.exam_date,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMinutes: row.duration_minutes,
    totalMarks: row.total_marks == null ? null : num(row.total_marks),
    passingMarks: row.passing_marks == null ? null : num(row.passing_marks),
    status: row.status,
    result: null,
  }));

  const materials: PortalMaterial[] = lessonPlanRows.map((row) => ({
    id: row.id,
    title: row.title,
    className: row.class_id ? classById.get(row.class_id)?.name ?? null : null,
    subjectName: row.subject_id ? subjectById.get(row.subject_id)?.name ?? null : null,
    lessonDate: row.lesson_date,
    objectives: row.objectives,
    materials: row.materials,
    activities: Array.isArray(row.activities)
      ? row.activities.map((entry) => String(entry)).join(', ')
      : typeof row.activities === 'string'
        ? row.activities
        : null,
    assessment: row.assessment,
    durationMinutes: row.duration_minutes == null ? null : num(row.duration_minutes),
    status: row.status,
  }));

  const pendingClasses = classRecords
    .filter((row) => {
      const classStudents = studentRows.filter((student) => student.class_id === row.id);
      return classStudents.length > 0 && !classStudents.some((student) => todayPersonIds.has(student.id));
    })
    .map((row) => ({
      classId: row.id,
      className: row.name || 'Class',
      studentCount: studentRows.filter((student) => student.class_id === row.id).length,
    }));

  const data: PortalTeacherData = {
    portal: 'teacher',
    profile,
    teacher: teacher
      ? {
          id: teacher.id,
          employeeCode: teacher.employee_code || '—',
          fullName: teacher.full_name || profile.name,
          email: teacher.email,
          phone: teacher.phone,
          departmentName: department?.name ?? null,
          qualification: teacher.qualification,
          specialization: teacher.specialization,
          joinDate: teacher.join_date,
          status: teacher.status,
          photoUrl: teacher.photo_url,
        }
      : {
          id: user.id,
          employeeCode: '—',
          fullName: profile.name,
          email: profile.email,
          phone: profile.phone,
          departmentName: department?.name ?? null,
          qualification: null,
          specialization: null,
          joinDate: null,
          status: null,
          photoUrl: profile.avatarUrl,
        },
    classes,
    students,
    subjects,
    timetable,
    attendance: {
      summary: attendanceSummary(attendanceRows),
      recent: attendanceRows.slice(0, 60).map((row) => ({
        id: row.id,
        date: row.date,
        status: row.status,
        checkInTime: row.check_in_time,
        checkOutTime: row.check_out_time,
        lateMinutes: num(row.late_minutes),
        remarks: row.remarks,
      })),
      monthly: monthlyAttendance(attendanceRows),
      todayDone: todayRows.length,
      pendingClasses,
    },
    assignments,
    submissions,
    exams,
    materials,
    stats: {
      classes: classes.length,
      students: students.length,
      subjects: new Set(classSubjectRows.map((row) => row.subject_id)).size,
      pendingReview: assignments.reduce((sum, item) => sum + item.pendingReview, 0),
    },
  };

  return NextResponse.json(data);
}
