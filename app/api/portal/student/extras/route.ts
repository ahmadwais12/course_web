import { NextResponse } from 'next/server';
import { portalsForNav } from '@/lib/portals';
import {
  num,
  requirePortalUser,
  safeRow,
  safeRows,
  str,
} from '@/lib/portal-api';
import type {
  PortalAnnouncement,
  PortalCalendarEntry,
  PortalDigitalResource,
  PortalExamHistoryRow,
  PortalFeedbackEntry,
  PortalFeeStructureRow,
  PortalLibraryBook,
  PortalLibraryLoan,
  PortalMaterial,
  PortalPlacementAttempt,
  PortalPlacementTest,
  PortalProgressRow,
  PortalStudentExtras,
  PortalSupportTicket,
} from '@/lib/portal-types';

type StudentRow = { id: string; class_id: string | null; program_id: string | null };
type ClassRow = { id: string; name: string | null; program_id: string | null };
type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  status: string | null;
};
type HolidayRow = { id: string; name: string; date: string; description: string | null; is_recurring: boolean | null };
type ExamRow = {
  id: string;
  name: string;
  subject: string | null;
  exam_date: string | null;
  start_time: string | null;
  status: string | null;
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
type SubjectRow = { id: string; name: string };
type TicketRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string | null;
  status: string | null;
  resolution_notes: string | null;
  created_at: string | null;
  resolved_at: string | null;
};
type FeeStructureRow = {
  id: string;
  name: string;
  fee_type_id: string | null;
  class_id: string | null;
  program_id: string | null;
  amount: number | null;
  currency: string | null;
  frequency: string | null;
  due_day: number | null;
  effective_from: string | null;
  effective_until: string | null;
  is_active: boolean | null;
};
type FeeTypeRow = { id: string; name: string | null };
type ProgressRow = {
  id: string;
  subject: string | null;
  attendance_percentage: number | null;
  average_score: number | null;
  assignments_completed: number | null;
  assignments_total: number | null;
  performance_trend: string | null;
  updated_at: string | null;
};
type ExamHistoryRow = {
  id: string;
  exam_name: string;
  subject: string | null;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  grade: string | null;
  exam_date: string | null;
  comments: string | null;
};
type PlacementTestRow = {
  id: string;
  name: string;
  description: string | null;
  exam_type: string | null;
  duration_minutes: number | null;
  total_questions: number | null;
  passing_score: number | null;
  max_score: number | null;
  instructions: string | null;
  is_active: boolean | null;
};
type PlacementAttemptRow = {
  id: string;
  placement_test_id: string | null;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  grade: string | null;
  status: string | null;
  completed_at: string | null;
};
type LibraryBookRow = {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  isbn: string | null;
  publisher: string | null;
  publish_year: number | null;
  quantity: number | null;
  available_quantity: number | null;
  location: string | null;
};
type BookIssueRow = {
  id: string;
  book_id: string | null;
  issue_date: string | null;
  due_date: string | null;
  return_date: string | null;
  status: string | null;
  fine_amount: number | null;
};
type DigitalResourceRow = {
  id: string;
  title: string;
  type: string | null;
  subject: string | null;
  author: string | null;
  file_url: string | null;
  download_enabled: boolean | null;
};
type FeedbackRow = {
  id: string;
  feedback_type: string | null;
  rating: number | null;
  title: string | null;
  comment: string | null;
  is_anonymous: boolean | null;
  status: string | null;
  response: string | null;
  created_at: string | null;
};

export async function GET() {
  const auth = await requirePortalUser((role) => portalsForNav(role).includes('student'));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { admin, user } = auth;

  const student = await safeRow<StudentRow>(
    admin
      .from('students')
      .select('id, class_id, program_id')
      .eq('profile_id', user.id)
      .limit(1)
      .maybeSingle()
  );

  const empty: PortalStudentExtras = {
    calendar: [],
    materials: [],
    announcements: [],
    support: [],
    feeStructure: [],
    progress: [],
    examHistory: [],
    placementTests: [],
    placementAttempts: [],
    library: { books: [], loans: [], digital: [] },
    feedback: [],
  };
  if (!student) return NextResponse.json(empty);

  const classRow = student.class_id
    ? await safeRow<ClassRow>(
        admin.from('classes').select('id, name, program_id').eq('id', student.class_id).maybeSingle()
      )
    : null;
  const programId = classRow?.program_id || student.program_id;

  const eventsQuery = admin
    .from('events')
    .select('id, title, description, event_type, start_date, end_date, location, status')
    .in('status', ['scheduled', 'in_progress'])
    .order('start_date', { ascending: true })
    .limit(80);
  const holidaysQuery = admin
    .from('holidays')
    .select('id, name, date, description, is_recurring')
    .order('date', { ascending: true })
    .limit(80);
  const announcementsQuery = admin
    .from('announcements')
    .select('id, title, content, type, priority, audience, publish_date, expiry_date, is_pinned, attachment_url, attachment_name')
    .eq('status', 'published')
    .in('audience', ['all', 'students'])
    .order('publish_date', { ascending: false })
    .limit(50);

  const [events, holidays, examRows, announcements, lessonPlans, tickets, feeByClass, feeByProgram] =
    await Promise.all([
      safeRows<EventRow>(user.tenantId ? eventsQuery.eq('tenant_id', user.tenantId) : eventsQuery),
      safeRows<HolidayRow>(user.tenantId ? holidaysQuery.eq('tenant_id', user.tenantId) : holidaysQuery),
      student.class_id
        ? safeRows<ExamRow>(
            admin
              .from('exams')
              .select('id, name, subject, exam_date, start_time, status')
              .eq('class_id', student.class_id)
              .not('exam_date', 'is', null)
              .order('exam_date', { ascending: true })
              .limit(60)
          )
        : Promise.resolve([]),
      safeRows<AnnouncementRow>(
        user.tenantId ? announcementsQuery.eq('tenant_id', user.tenantId) : announcementsQuery
      ),
      student.class_id
        ? safeRows<LessonPlanRow>(
            admin
              .from('lesson_plans')
              .select('id, class_id, subject_id, title, objectives, materials, activities, assessment, lesson_date, duration_minutes, status')
              .eq('class_id', student.class_id)
              .in('status', ['approved', 'completed'])
              .order('lesson_date', { ascending: false })
              .limit(100)
          )
        : Promise.resolve([]),
      safeRows<TicketRow>(
        admin
          .from('support_tickets')
          .select('id, title, description, category, priority, status, resolution_notes, created_at, resolved_at')
          .eq('reported_by', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
      ),
      student.class_id
        ? safeRows<FeeStructureRow>(
            admin
              .from('fee_structures')
              .select('id, name, fee_type_id, class_id, program_id, amount, currency, frequency, due_day, effective_from, effective_until, is_active')
              .eq('class_id', student.class_id)
              .eq('is_active', true)
              .order('name')
              .limit(60)
          )
        : Promise.resolve([]),
      programId
        ? safeRows<FeeStructureRow>(
            admin
              .from('fee_structures')
              .select('id, name, fee_type_id, class_id, program_id, amount, currency, frequency, due_day, effective_from, effective_until, is_active')
              .eq('program_id', programId)
              .eq('is_active', true)
              .order('name')
              .limit(60)
          )
        : Promise.resolve([]),
    ]);

  const calendar: PortalCalendarEntry[] = [
    ...events.map((row) => ({
      id: `event-${row.id}`,
      title: row.title,
      description: row.description,
      type: row.event_type || 'event',
      startDate: row.start_date,
      endDate: row.end_date,
      location: row.location,
      source: 'event' as const,
    })),
    ...examRows
      .filter((row) => row.exam_date)
      .map((row) => ({
        id: `exam-${row.id}`,
        title: row.name,
        description: row.subject,
        type: row.status || 'exam',
        startDate: row.exam_date as string,
        endDate: null,
        location: row.start_time,
        source: 'exam' as const,
      })),
    ...holidays.map((row) => ({
      id: `holiday-${row.id}`,
      title: row.name,
      description: row.description,
      type: 'holiday',
      startDate: row.date,
      endDate: null,
      location: null,
      source: 'holiday' as const,
    })),
  ].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const placementTestsQuery = admin
    .from('placement_tests')
    .select('id, name, description, exam_type, duration_minutes, total_questions, passing_score, max_score, instructions, is_active')
    .order('name')
    .limit(200);

  const [
    progressRows,
    examHistoryRows,
    placementTestRows,
    placementAttemptRows,
    libraryBookRows,
    bookIssueRows,
    digitalResourceRows,
    feedbackRows,
  ] = await Promise.all([
    safeRows<ProgressRow>(
      admin
        .from('student_progress')
        .select('id, subject, attendance_percentage, average_score, assignments_completed, assignments_total, performance_trend, updated_at')
        .eq('student_id', student.id)
        .order('updated_at', { ascending: false })
        .limit(100)
    ),
    safeRows<ExamHistoryRow>(
      admin
        .from('exam_results')
        .select('id, exam_name, subject, score, max_score, percentage, grade, exam_date, comments')
        .eq('student_id', student.id)
        .order('exam_date', { ascending: false })
        .limit(100)
    ),
    safeRows<PlacementTestRow>(
      // Placement tests are often created as global (tenant_id null) templates.
      user.tenantId
        ? placementTestsQuery.or(`tenant_id.eq.${user.tenantId},tenant_id.is.null`)
        : placementTestsQuery
    ),
    safeRows<PlacementAttemptRow>(
      admin
        .from('placement_test_attempts')
        .select('id, placement_test_id, score, max_score, percentage, grade, status, completed_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
    ),
    safeRows<LibraryBookRow>(
      admin
        .from('library_books')
        .select('id, title, author, category, isbn, publisher, publish_year, quantity, available_quantity, location')
        .order('title')
        .limit(300)
    ),
    safeRows<BookIssueRow>(
      admin
        .from('book_issues')
        .select('id, book_id, issue_date, due_date, return_date, status, fine_amount')
        .eq('student_id', student.id)
        .order('issue_date', { ascending: false })
        .limit(100)
    ),
    safeRows<DigitalResourceRow>(
      admin
        .from('digital_library')
        .select('id, title, type, subject, author, file_url, download_enabled')
        .order('title')
        .limit(100)
    ),
    safeRows<FeedbackRow>(
      admin
        .from('feedback')
        .select('id, feedback_type, rating, title, comment, is_anonymous, status, response, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
    ),
  ]);

  const bookById = new Map(libraryBookRows.map((row) => [row.id, row]));
  const placementTestById = new Map(placementTestRows.map((row) => [row.id, row]));

  const progress: PortalProgressRow[] = progressRows.map((row) => ({
    id: row.id,
    subject: row.subject,
    attendancePercentage: num(row.attendance_percentage),
    averageScore: num(row.average_score),
    assignmentsCompleted: num(row.assignments_completed),
    assignmentsTotal: num(row.assignments_total),
    performanceTrend: row.performance_trend,
    updatedAt: row.updated_at,
  }));

  const examHistory: PortalExamHistoryRow[] = examHistoryRows.map((row) => ({
    id: row.id,
    examName: row.exam_name,
    subject: row.subject,
    score: row.score == null ? null : num(row.score),
    maxScore: row.max_score == null ? null : num(row.max_score),
    percentage: row.percentage == null ? null : num(row.percentage),
    grade: row.grade,
    examDate: row.exam_date,
    comments: row.comments,
  }));

  const placementTests: PortalPlacementTest[] = placementTestRows
    .filter((row) => row.is_active !== false)
    .map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      examType: row.exam_type,
      durationMinutes: row.duration_minutes == null ? null : num(row.duration_minutes),
      totalQuestions: row.total_questions == null ? null : num(row.total_questions),
      passingScore: row.passing_score == null ? null : num(row.passing_score),
      maxScore: row.max_score == null ? null : num(row.max_score),
      instructions: row.instructions,
    }));

  const placementAttempts: PortalPlacementAttempt[] = placementAttemptRows.map((row) => ({
    id: row.id,
    testName: (row.placement_test_id && placementTestById.get(row.placement_test_id)?.name) || 'Placement test',
    score: row.score == null ? null : num(row.score),
    maxScore: row.max_score == null ? null : num(row.max_score),
    percentage: row.percentage == null ? null : num(row.percentage),
    grade: row.grade,
    status: row.status,
    completedAt: row.completed_at,
  }));

  const books: PortalLibraryBook[] = libraryBookRows.map((row) => ({
    id: row.id,
    title: row.title,
    author: row.author,
    category: row.category,
    isbn: row.isbn,
    publisher: row.publisher,
    publishYear: row.publish_year == null ? null : num(row.publish_year),
    quantity: num(row.quantity),
    availableQuantity: num(row.available_quantity),
    location: row.location,
  }));

  const loans: PortalLibraryLoan[] = bookIssueRows.map((row) => ({
    id: row.id,
    bookTitle: (row.book_id && bookById.get(row.book_id)?.title) || 'Library book',
    issueDate: row.issue_date,
    dueDate: row.due_date,
    returnDate: row.return_date,
    status: row.status,
    fineAmount: num(row.fine_amount),
  }));

  const digital: PortalDigitalResource[] = digitalResourceRows.map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type,
    subject: row.subject,
    author: row.author,
    fileUrl: row.file_url,
    downloadEnabled: Boolean(row.download_enabled),
  }));

  const feedback: PortalFeedbackEntry[] = feedbackRows.map((row) => ({
    id: row.id,
    feedbackType: row.feedback_type,
    rating: row.rating == null ? null : num(row.rating),
    title: row.title,
    comment: row.comment,
    isAnonymous: Boolean(row.is_anonymous),
    status: row.status,
    response: row.response,
    createdAt: row.created_at,
  }));

  const subjectIds = [...new Set(
    lessonPlans.map((row) => row.subject_id).filter((value): value is string => Boolean(value))
  )];
  const feeRows = [...feeByClass, ...feeByProgram].filter(
    (row, index, all) => all.findIndex((item) => item.id === row.id) === index
  );
  const feeTypeIds = [...new Set(
    feeRows.map((row) => row.fee_type_id).filter((value): value is string => Boolean(value))
  )];

  const [subjects, feeTypes] = await Promise.all([
    subjectIds.length
      ? safeRows<SubjectRow>(admin.from('subjects').select('id, name').in('id', subjectIds))
      : Promise.resolve([]),
    feeTypeIds.length
      ? safeRows<FeeTypeRow>(admin.from('fee_types').select('id, name').in('id', feeTypeIds))
      : Promise.resolve([]),
  ]);

  const subjectById = new Map(subjects.map((row) => [row.id, row.name]));
  const feeTypeById = new Map(feeTypes.map((row) => [row.id, row.name]));

  const materials: PortalMaterial[] = lessonPlans.map((row) => ({
    id: row.id,
    title: row.title,
    className: classRow?.name ?? null,
    subjectName: row.subject_id ? subjectById.get(row.subject_id) ?? null : null,
    lessonDate: row.lesson_date,
    objectives: row.objectives,
    materials: row.materials,
    activities: Array.isArray(row.activities)
      ? row.activities.map((entry) => String(entry)).join(', ')
      : str(row.activities),
    assessment: row.assessment,
    durationMinutes: row.duration_minutes == null ? null : num(row.duration_minutes),
    status: row.status,
  }));

  const feeStructureRows: PortalFeeStructureRow[] = feeRows.map((row) => ({
    id: row.id,
    name: row.name,
    feeType: row.fee_type_id ? feeTypeById.get(row.fee_type_id) ?? null : null,
    amount: num(row.amount),
    currency: row.currency || 'AFN',
    frequency: row.frequency,
    dueDay: row.due_day,
    className: classRow?.name ?? null,
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until,
    isActive: Boolean(row.is_active),
  }));

  const data: PortalStudentExtras = {
    calendar,
    materials,
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
    })) satisfies PortalAnnouncement[],
    support: tickets.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      priority: row.priority,
      status: row.status,
      resolutionNotes: row.resolution_notes,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
    })) satisfies PortalSupportTicket[],
    feeStructure: feeStructureRows,
    progress,
    examHistory,
    placementTests,
    placementAttempts,
    library: { books, loans, digital },
    feedback,
  };

  return NextResponse.json(data);
}
