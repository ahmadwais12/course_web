import { NextResponse } from 'next/server';
import { portalsForNav } from '@/lib/portals';
import { num, requirePortalUser, safeRow, safeRows } from '@/lib/portal-api';
import type {
  PortalTeacherAttendanceRow,
  PortalTeacherExtras,
  PortalTeacherGradeRow,
} from '@/lib/portal-types';

type TeacherRow = { id: string };
type ClassRow = { id: string; name: string | null };
type ClassSubjectRow = { class_id: string };
type StudentRow = { id: string; full_name: string | null; class_id: string | null };
type AttendanceRow = {
  id: string;
  person_id: string;
  date: string;
  status: string | null;
  late_minutes: number | null;
  remarks: string | null;
};
type ExamResultRow = {
  id: string;
  student_id: string | null;
  exam_name: string;
  subject: string | null;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  grade: string | null;
  exam_date: string | null;
  class_id: string | null;
  comments: string | null;
};
type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  type: string | null;
  priority: string | null;
  audience: string | null;
  publish_date: string | null;
  expiry_date: string | null;
  is_pinned: boolean | null;
  attachment_url: string | null;
  attachment_name: string | null;
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

  const empty: PortalTeacherExtras = { attendance: [], grades: [], announcements: [] };

  const announcementsQuery = admin
    .from('announcements')
    .select('id, title, content, type, priority, audience, publish_date, expiry_date, is_pinned, attachment_url, attachment_name')
    .eq('status', 'published')
    .in('audience', ['all', 'teachers'])
    .order('publish_date', { ascending: false })
    .limit(50);

  if (!classIds.length) {
    const announcements = await safeRows<AnnouncementRow>(
      user.tenantId ? announcementsQuery.eq('tenant_id', user.tenantId) : announcementsQuery
    );
    return NextResponse.json({
      ...empty,
      announcements: announcements.map((row) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        type: row.type,
        priority: row.priority,
        audience: row.audience,
        publishDate: row.publish_date,
        expiryDate: row.expiry_date,
        isPinned: Boolean(row.is_pinned),
        attachmentUrl: row.attachment_url,
        attachmentName: row.attachment_name,
      })),
    } satisfies PortalTeacherExtras);
  }

  const [classRecords, studentRows, announcements] = await Promise.all([
    safeRows<ClassRow>(admin.from('classes').select('id, name').in('id', classIds)),
    safeRows<StudentRow>(
      admin.from('students').select('id, full_name, class_id').in('class_id', classIds)
    ),
    safeRows<AnnouncementRow>(
      user.tenantId ? announcementsQuery.eq('tenant_id', user.tenantId) : announcementsQuery
    ),
  ]);

  const studentIds = studentRows.map((row) => row.id);

  const [attendanceRows, resultRows] = await Promise.all([
    studentIds.length
      ? safeRows<AttendanceRow>(
          admin
            .from('attendance')
            .select('id, person_id, date, status, late_minutes, remarks')
            .eq('person_type', 'student')
            .in('person_id', studentIds)
            .order('date', { ascending: false })
            .limit(2000)
        )
      : Promise.resolve([]),
    safeRows<ExamResultRow>(
      admin
        .from('exam_results')
        .select('id, student_id, exam_name, subject, score, max_score, percentage, grade, exam_date, class_id, comments')
        .in('class_id', classIds)
        .order('exam_date', { ascending: false })
        .limit(500)
    ),
  ]);

  const classById = new Map(classRecords.map((row) => [row.id, row]));
  const studentById = new Map(studentRows.map((row) => [row.id, row]));

  const attendance: PortalTeacherAttendanceRow[] = attendanceRows.map((row) => {
    const student = studentById.get(row.person_id);
    return {
      id: row.id,
      studentId: row.person_id,
      studentName: student?.full_name || 'Student',
      className: student?.class_id ? classById.get(student.class_id)?.name ?? null : null,
      classId: student?.class_id ?? null,
      date: row.date,
      status: row.status,
      lateMinutes: num(row.late_minutes),
      remarks: row.remarks,
    };
  });

  const grades: PortalTeacherGradeRow[] = resultRows.map((row) => {
    const student = row.student_id ? studentById.get(row.student_id) : null;
    const maxScore = row.max_score == null ? 100 : num(row.max_score);
    return {
      id: row.id,
      studentId: row.student_id || '',
      studentName: student?.full_name || 'Student',
      className: row.class_id ? classById.get(row.class_id)?.name ?? null : null,
      classId: row.class_id,
      examName: row.exam_name,
      subject: row.subject,
      score: num(row.score),
      maxScore,
      percentage: row.percentage == null ? null : num(row.percentage),
      grade: row.grade,
      examDate: row.exam_date,
      comments: row.comments,
    };
  });

  const data: PortalTeacherExtras = {
    attendance,
    grades,
    announcements: announcements.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      type: row.type,
      priority: row.priority,
      audience: row.audience,
      publishDate: row.publish_date,
      expiryDate: row.expiry_date,
      isPinned: Boolean(row.is_pinned),
      attachmentUrl: row.attachment_url,
      attachmentName: row.attachment_name,
    })),
  };

  return NextResponse.json(data);
}
