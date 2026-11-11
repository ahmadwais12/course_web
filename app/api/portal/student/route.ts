import { NextResponse } from 'next/server';
import { portalsForNav } from '@/lib/portals';
import {
  attendanceSummary,
  jsonDocuments,
  monthlyAttendance,
  num,
  requirePortalUser,
  safeRow,
  safeRows,
  type AttendanceRow,
} from '@/lib/portal-api';
import type {
  PortalAssignment,
  PortalCertificate,
  PortalDocument,
  PortalEnrollment,
  PortalExam,
  PortalGrade,
  PortalInvoice,
  PortalPayment,
  PortalStudentData,
  PortalSubject,
  PortalTimetableSlot,
} from '@/lib/portal-types';

type StudentRow = {
  id: string;
  student_code: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  photo_url: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  guardian_relationship: string | null;
  enrollment_date: string | null;
  expected_completion_date: string | null;
  status: string | null;
  student_level: string | null;
  batch_number: string | null;
  total_fees: number | null;
  paid_amount: number | null;
  outstanding_balance: number | null;
  attendance_percentage: number | null;
  average_grade: number | null;
  certificate_issued: boolean | null;
  certificate_url: string | null;
  class_id: string | null;
  program_id: string | null;
  documents: unknown;
};

type ClassRow = { id: string; name: string | null; grade: string | null; program_id: string | null };
type ProgramRow = { id: string; name: string | null; code: string | null };
type ClassSubjectRow = { id: string; class_id: string; subject_id: string; teacher_id: string | null };
type SubjectRow = { id: string; name: string; code: string };
type UserRow = { id: string; full_name: string | null };
type TimetableRow = {
  id: string;
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
  subject_id: string | null;
  class_id: string | null;
  assigned_date: string | null;
  due_date: string | null;
  max_marks: number | null;
  attachment_url: string | null;
  status: string | null;
};
type SubmissionRow = {
  id: string;
  homework_id: string;
  submitted_at: string | null;
  marks_obtained: number | null;
  feedback: string | null;
  status: string | null;
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
type GradeRow = {
  id: string;
  exam_id: string | null;
  subject: string | null;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  grade: string | null;
  remarks: string | null;
  status: string | null;
  graded_at: string | null;
};
type InvoiceRow = {
  id: string;
  invoice_number: string;
  amount: number | null;
  total_amount: number | null;
  paid_amount: number | null;
  outstanding_amount: number | null;
  issue_date: string | null;
  due_date: string | null;
  status: string | null;
  description: string | null;
};
type PaymentRow = {
  id: string;
  payment_number: string;
  amount: number | null;
  payment_date: string | null;
  payment_method: string | null;
  payment_type: string | null;
  status: string | null;
  reference_number: string | null;
  receipt_url: string | null;
};
type DocumentRow = {
  id: string;
  document_type: string | null;
  document_url: string;
  issue_date: string | null;
  expiry_date: string | null;
  issued_by: string | null;
  is_verified: boolean | null;
};
type LeaveRow = {
  id: string;
  start_date: string;
  end_date: string | null;
  reason: string | null;
  status: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string | null;
};
type EnrollmentRow = {
  id: string;
  class_id: string | null;
  academic_year_id: string | null;
  enrollment_date: string | null;
  status: string | null;
  grade: string | null;
  remarks: string | null;
};
type AcademicYearRow = { id: string; name: string | null };
type CertificateRow = {
  id: string;
  certificate_type: string | null;
  course_name: string | null;
  level_achieved: string | null;
  issue_date: string | null;
  certificate_number: string | null;
  certificate_url: string | null;
  status: string | null;
  notes: string | null;
};

export async function GET() {
  const auth = await requirePortalUser((role) => portalsForNav(role).includes('student'));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { admin, user } = auth;
  const profile = {
    id: user.id,
    name: user.name || user.email || 'Student',
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
    tenantId: user.tenantId,
  };

  const student = await safeRow<StudentRow>(
    admin
      .from('students')
      .select(
        'id, student_code, full_name, email, phone, date_of_birth, gender, address, city, photo_url, guardian_name, guardian_phone, guardian_email, guardian_relationship, enrollment_date, expected_completion_date, status, student_level, batch_number, total_fees, paid_amount, outstanding_balance, attendance_percentage, average_grade, certificate_issued, certificate_url, class_id, program_id, documents'
      )
      .eq('profile_id', user.id)
      .limit(1)
      .maybeSingle()
  );

  if (!student) {
    const empty: PortalStudentData = {
      portal: 'student',
      profile,
      student: null,
      subjects: [],
      timetable: [],
      attendance: { summary: attendanceSummary([]), recent: [], monthly: [] },
      assignments: [],
      exams: [],
      results: [],
      enrollments: [],
      certificates: [],
      finance: {
        invoices: [],
        payments: [],
        totals: { billed: 0, paid: 0, outstanding: 0, overdue: 0 },
      },
      documents: [],
      leaves: [],
    };
    return NextResponse.json(empty);
  }

  const classRow = student.class_id
    ? await safeRow<ClassRow>(
        admin
          .from('classes')
          .select('id, name, grade, program_id')
          .eq('id', student.class_id)
          .maybeSingle()
      )
    : null;
  const programId = classRow?.program_id || student.program_id;
  const program = programId
    ? await safeRow<ProgramRow>(
        admin.from('programs').select('id, name, code').eq('id', programId).maybeSingle()
      )
    : null;

  const [classSubjects, timetableRows, attendanceRows, homeworkRows, examRows, gradeRows, invoiceRows, paymentRows, documentRows, leaveRows] =
    await Promise.all([
      student.class_id
        ? safeRows<ClassSubjectRow>(
            admin
              .from('class_subjects')
              .select('id, class_id, subject_id, teacher_id')
              .eq('class_id', student.class_id)
              .eq('is_active', true)
          )
        : Promise.resolve([]),
      student.class_id
        ? safeRows<TimetableRow>(
            admin
              .from('timetables')
              .select('id, day_of_week, start_time, end_time, subject_id, teacher_id, room_id')
              .eq('class_id', student.class_id)
              .eq('is_active', true)
              .order('day_of_week')
          )
        : Promise.resolve([]),
      safeRows<AttendanceRow>(
        admin
          .from('attendance')
          .select('id, person_id, date, status, check_in_time, check_out_time, late_minutes, remarks')
          .eq('person_type', 'student')
          .in('person_id', [student.id, user.id])
          .order('date', { ascending: false })
          .limit(400)
      ),
      student.class_id
        ? safeRows<HomeworkRow>(
            admin
              .from('homework')
              .select('id, title, description, subject_id, class_id, assigned_date, due_date, max_marks, attachment_url, status')
              .eq('class_id', student.class_id)
              .neq('status', 'draft')
              .order('due_date', { ascending: false })
              .limit(100)
          )
        : Promise.resolve([]),
      student.class_id
        ? safeRows<ExamRow>(
            admin
              .from('exams')
              .select('id, name, exam_type, subject, class_id, exam_date, start_time, end_time, duration_minutes, total_marks, passing_marks, status')
              .eq('class_id', student.class_id)
              .order('exam_date', { ascending: false })
              .limit(100)
          )
        : Promise.resolve([]),
      safeRows<GradeRow>(
        admin
          .from('grades')
          .select('id, exam_id, subject, score, max_score, percentage, grade, remarks, status, graded_at')
          .eq('student_id', student.id)
          .order('graded_at', { ascending: false })
          .limit(200)
      ),
      safeRows<InvoiceRow>(
        admin
          .from('invoices')
          .select('id, invoice_number, amount, total_amount, paid_amount, outstanding_amount, issue_date, due_date, status, description')
          .eq('student_id', student.id)
          .order('issue_date', { ascending: false })
          .limit(100)
      ),
      safeRows<PaymentRow>(
        admin
          .from('payments')
          .select('id, payment_number, amount, payment_date, payment_method, payment_type, status, reference_number, receipt_url')
          .eq('student_id', student.id)
          .order('payment_date', { ascending: false })
          .limit(100)
      ),
      safeRows<DocumentRow>(
        admin
          .from('student_documents')
          .select('id, document_type, document_url, issue_date, expiry_date, issued_by, is_verified')
          .eq('student_id', student.id)
          .order('created_at', { ascending: false })
          .limit(100)
      ),
      safeRows<LeaveRow>(
        admin
          .from('student_leaves')
          .select('id, start_date, end_date, reason, status, rejection_reason, approved_at, created_at')
          .eq('student_id', student.id)
          .order('created_at', { ascending: false })
          .limit(50)
      ),
    ]);

  const [enrollmentRows, certificateRows] = await Promise.all([
    safeRows<EnrollmentRow>(
      admin
        .from('student_enrollments')
        .select('id, class_id, academic_year_id, enrollment_date, status, grade, remarks')
        .eq('student_id', student.id)
        .order('enrollment_date', { ascending: false })
        .limit(50)
    ),
    safeRows<CertificateRow>(
      admin
        .from('certificates')
        .select('id, certificate_type, course_name, level_achieved, issue_date, certificate_number, certificate_url, status, notes')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
        .limit(50)
    ),
  ]);

  const enrollmentClassIds = [...new Set(
    enrollmentRows.map((row) => row.class_id).filter((value): value is string => Boolean(value))
  )];
  const academicYearIds = [...new Set(
    enrollmentRows
      .map((row) => row.academic_year_id)
      .filter((value): value is string => Boolean(value))
  )];
  const [enrollmentClasses, academicYears] = await Promise.all([
    enrollmentClassIds.length
      ? safeRows<ClassRow>(
          admin.from('classes').select('id, name, grade, program_id').in('id', enrollmentClassIds)
        )
      : Promise.resolve([]),
    academicYearIds.length
      ? safeRows<AcademicYearRow>(
          admin.from('academic_years').select('id, name').in('id', academicYearIds)
        )
      : Promise.resolve([]),
  ]);

  const subjectIds = [...new Set(classSubjects.map((row) => row.subject_id))];
  const teacherIds = [...new Set([
    ...classSubjects.map((row) => row.teacher_id),
    ...timetableRows.map((row) => row.teacher_id),
  ].filter((value): value is string => Boolean(value)))];
  const roomIds = [...new Set(
    timetableRows.map((row) => row.room_id).filter((value): value is string => Boolean(value))
  )];

  const [subjectRecords, teacherRecords, roomRecords, submissionRows] = await Promise.all([
    subjectIds.length
      ? safeRows<SubjectRow>(admin.from('subjects').select('id, name, code').in('id', subjectIds))
      : Promise.resolve([]),
    teacherIds.length
      ? safeRows<UserRow>(admin.from('users').select('id, full_name').in('id', teacherIds))
      : Promise.resolve([]),
    roomIds.length
      ? safeRows<RoomRow>(admin.from('rooms').select('id, name').in('id', roomIds))
      : Promise.resolve([]),
    homeworkRows.length
      ? safeRows<SubmissionRow>(
          admin
            .from('homework_submissions')
            .select('id, homework_id, submitted_at, marks_obtained, feedback, status')
            .eq('student_id', student.id)
            .in('homework_id', homeworkRows.map((row) => row.id))
        )
      : Promise.resolve([]),
  ]);

  const subjectById = new Map(subjectRecords.map((row) => [row.id, row]));
  const teacherById = new Map(teacherRecords.map((row) => [row.id, row]));
  const roomById = new Map(roomRecords.map((row) => [row.id, row]));
  const submissionByHomework = new Map(submissionRows.map((row) => [row.homework_id, row]));

  const subjects: PortalSubject[] = classSubjects
    .map((row) => {
      const subject = subjectById.get(row.subject_id);
      if (!subject) return null;
      return {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        teacherName: row.teacher_id ? teacherById.get(row.teacher_id)?.full_name ?? null : null,
        className: classRow?.name ?? null,
      };
    })
    .filter((row): row is PortalSubject => Boolean(row));

  const timetable: PortalTimetableSlot[] = timetableRows.map((row) => ({
    id: row.id,
    dayOfWeek: Number(row.day_of_week),
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    subjectName: row.subject_id ? subjectById.get(row.subject_id)?.name ?? null : null,
    className: classRow?.name ?? null,
    teacherName: row.teacher_id ? teacherById.get(row.teacher_id)?.full_name ?? null : null,
    roomName: row.room_id ? roomById.get(row.room_id)?.name ?? null : null,
  }));

  const assignments: PortalAssignment[] = homeworkRows.map((row) => {
    const submission = submissionByHomework.get(row.id);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      subjectName: row.subject_id ? subjectById.get(row.subject_id)?.name ?? null : null,
      className: classRow?.name ?? null,
      assignedDate: row.assigned_date,
      dueDate: row.due_date,
      maxMarks: row.max_marks == null ? null : num(row.max_marks),
      attachmentUrl: row.attachment_url,
      status: row.status,
      submissionStatus: submission?.status ?? null,
      submittedAt: submission?.submitted_at ?? null,
      marksObtained: submission?.marks_obtained == null ? null : num(submission.marks_obtained),
      feedback: submission?.feedback ?? null,
    };
  });

  const examById = new Map(examRows.map((row) => [row.id, row]));
  const results: PortalGrade[] = gradeRows.map((row) => ({
    id: row.id,
    examId: row.exam_id,
    examName: row.exam_id ? examById.get(row.exam_id)?.name ?? null : null,
    subject: row.subject,
    score: row.score == null ? null : num(row.score),
    maxScore: row.max_score == null ? null : num(row.max_score),
    percentage: row.percentage == null ? null : num(row.percentage),
    grade: row.grade,
    remarks: row.remarks,
    status: row.status,
    gradedAt: row.graded_at,
  }));
  const resultByExam = new Map(results.filter((row) => row.examId).map((row) => [row.examId, row]));

  const exams: PortalExam[] = examRows.map((row) => ({
    id: row.id,
    name: row.name,
    examType: row.exam_type,
    subject: row.subject,
    className: classRow?.name ?? null,
    examDate: row.exam_date,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMinutes: row.duration_minutes,
    totalMarks: row.total_marks == null ? null : num(row.total_marks),
    passingMarks: row.passing_marks == null ? null : num(row.passing_marks),
    status: row.status,
    result: resultByExam.get(row.id) ?? null,
  }));

  const invoices: PortalInvoice[] = invoiceRows.map((row) => ({
    id: row.id,
    invoiceNumber: row.invoice_number,
    amount: num(row.amount),
    totalAmount: row.total_amount == null ? num(row.amount) : num(row.total_amount),
    paidAmount: num(row.paid_amount),
    outstandingAmount:
      row.outstanding_amount == null
        ? Math.max(0, (row.total_amount == null ? num(row.amount) : num(row.total_amount)) - num(row.paid_amount))
        : num(row.outstanding_amount),
    issueDate: row.issue_date,
    dueDate: row.due_date,
    status: row.status,
    description: row.description,
  }));

  const payments: PortalPayment[] = paymentRows.map((row) => ({
    id: row.id,
    paymentNumber: row.payment_number,
    amount: num(row.amount),
    paymentDate: row.payment_date,
    paymentMethod: row.payment_method,
    paymentType: row.payment_type,
    status: row.status,
    referenceNumber: row.reference_number,
    receiptUrl: row.receipt_url,
  }));

  const today = new Date().toISOString().slice(0, 10);
  const totals = invoices.reduce(
    (acc, invoice) => {
      acc.billed += invoice.totalAmount;
      acc.paid += invoice.paidAmount;
      acc.outstanding += Math.max(0, invoice.outstandingAmount);
      if (invoice.status === 'overdue' || (invoice.dueDate && invoice.dueDate < today && invoice.outstandingAmount > 0)) {
        acc.overdue += Math.max(0, invoice.outstandingAmount);
      }
      return acc;
    },
    { billed: 0, paid: 0, outstanding: 0, overdue: 0 }
  );

  const documents: PortalDocument[] = [
    ...jsonDocuments(student.documents),
    ...documentRows.map((row) => ({
      id: row.id,
      title: (row.document_type || 'document').replaceAll('_', ' '),
      documentType: row.document_type,
      url: row.document_url,
      issueDate: row.issue_date,
      expiryDate: row.expiry_date,
      issuedBy: row.issued_by,
      isVerified: Boolean(row.is_verified),
    })),
  ];  if (student.certificate_url) {
    documents.unshift({
      id: 'certificate',
      title: 'Certificate',
      documentType: 'certificate',
      url: student.certificate_url,
      issueDate: null,
      expiryDate: null,
      issuedBy: null,
      isVerified: Boolean(student.certificate_issued),
    });
  }

  const enrollmentClassById = new Map(enrollmentClasses.map((row) => [row.id, row]));
  const academicYearById = new Map(academicYears.map((row) => [row.id, row]));

  const enrollments: PortalEnrollment[] = enrollmentRows.map((row) => ({
    id: row.id,
    className: row.class_id ? enrollmentClassById.get(row.class_id)?.name ?? null : null,
    academicYear: row.academic_year_id
      ? academicYearById.get(row.academic_year_id)?.name ?? null
      : null,
    enrollmentDate: row.enrollment_date,
    status: row.status,
    grade: row.grade,
    remarks: row.remarks,
  }));

  const certificates: PortalCertificate[] = certificateRows.map((row) => ({
    id: row.id,
    certificateType: row.certificate_type,
    courseName: row.course_name,
    levelAchieved: row.level_achieved,
    issueDate: row.issue_date,
    certificateNumber: row.certificate_number,
    certificateUrl: row.certificate_url,
    status: row.status,
    notes: row.notes,
  }));

  const data: PortalStudentData = {
    portal: 'student',
    profile,
    student: {
      id: student.id,
      studentCode: student.student_code || '—',
      fullName: student.full_name || profile.name,
      email: student.email,
      phone: student.phone,
      dateOfBirth: student.date_of_birth,
      gender: student.gender,
      address: student.address,
      city: student.city,
      photoUrl: student.photo_url,
      guardianName: student.guardian_name,
      guardianPhone: student.guardian_phone,
      guardianEmail: student.guardian_email,
      guardianRelationship: student.guardian_relationship,
      enrollmentDate: student.enrollment_date,
      expectedCompletionDate: student.expected_completion_date,
      status: student.status,
      studentLevel: student.student_level,
      batchNumber: student.batch_number,
      totalFees: num(student.total_fees),
      paidAmount: num(student.paid_amount),
      outstandingBalance: num(student.outstanding_balance),
      attendancePercentage: num(student.attendance_percentage),
      averageGrade: num(student.average_grade),
      certificateIssued: Boolean(student.certificate_issued),
      certificateUrl: student.certificate_url,
      class: {
        id: classRow?.id ?? null,
        name: classRow?.name ?? null,
        grade: classRow?.grade ?? null,
        programName: program?.name ?? null,
      },
    },
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
    },
    assignments,
    exams,
    results,
    enrollments,
    certificates,
    finance: { invoices, payments, totals },
    documents,
    leaves: leaveRows.map((row) => ({
      id: row.id,
      leaveType: 'Student leave',
      startDate: row.start_date,
      endDate: row.end_date,
      reason: row.reason,
      status: row.status,
      rejectionReason: row.rejection_reason,
      approvedAt: row.approved_at,
      createdAt: row.created_at,
    })),
  };

  return NextResponse.json(data);
}
