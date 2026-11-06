import { toISODate } from '@/lib/ai/period';
import {
  PERIOD_PARAMS,
  countBy,
  fetchRows,
  idsOrNil,
  labelTenants,
  num,
  pct,
  periodFrom,
  scopeInfo,
  scoped,
  teacherClassIds,
  tenantNameMap,
  topEntries,
  type ToolDefinition,
} from '@/lib/ai/tools/common';
import { attendanceOf, loadStudentAttendance, loadStudents } from '@/lib/ai/tools/metrics';

function teacherNote(ctx: { role: string }) {
  return ctx.role === 'teacher' ? ['Limited to students in classes assigned to you.'] : [];
}

async function classNames(
  db: Parameters<ToolDefinition['execute']>[2],
  ctx: Parameters<ToolDefinition['execute']>[1],
  ids: string[]
) {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, 300);
  if (!unique.length) return {} as Record<string, string>;
  const { data } = await scoped(db.from('classes').select('id, name'), ctx).in('id', unique);
  const out: Record<string, string> = {};
  for (const row of (data ?? []) as { id: string; name: string | null }[]) out[row.id] = row.name || 'Unnamed class';
  return out;
}

const getStudentCount: ToolDefinition = {
  name: 'get_student_count',
  module: 'academic',
  description:
    'Current number of students by status (active, inactive, graduated, ...) and by branch, plus students registered in the period.',
  parameters: { type: 'object', properties: { ...PERIOD_PARAMS } },
  async execute(args, ctx, db) {
    const period = periodFrom(args);
    const { rows, truncated } = await loadStudents(db, ctx);
    const names = await tenantNameMap(db, ctx, rows.map((r) => r.tenant_id || ''));
    const byStatus = countBy(rows, (r) => r.status);
    const registered = rows.filter((r) => {
      const d = (r.created_at || '').slice(0, 10);
      return d >= period.from && d <= period.to;
    }).length;
    return {
      data: {
        total_students: rows.length,
        active_students: byStatus.active ?? 0,
        by_status: byStatus,
        by_branch: labelTenants(countBy(rows, (r) => r.tenant_id), names),
        registered_in_period: registered,
        truncated,
      },
      scope: scopeInfo(ctx, period, { note: 'Registered = student record created within the period.' }),
      chart: {
        type: 'bar',
        title: 'Students by status',
        data: Object.entries(byStatus).map(([label, value]) => ({ label, students: value })),
        series: [{ key: 'students', label: 'Students' }],
      },
      links: [{ label: 'Students', href: '/students' }],
      notes: teacherNote(ctx),
    };
  },
};

const getEnrollmentSummary: ToolDefinition = {
  name: 'get_student_enrollment_summary',
  module: 'academic',
  description:
    'Class enrollments (student_enrollments) created in the period by status, class, and branch.',
  parameters: { type: 'object', properties: { ...PERIOD_PARAMS } },
  async execute(args, ctx, db) {
    const period = periodFrom(args);
    const classIds = await teacherClassIds(db, ctx);
    let query = scoped(db.from('student_enrollments').select('status, class_id, tenant_id, enrollment_date'), ctx)
      .gte('enrollment_date', period.from)
      .lte('enrollment_date', period.to);
    if (classIds) query = query.in('class_id', idsOrNil(classIds));
    const { rows, truncated } = await fetchRows<{
      status: string | null;
      class_id: string | null;
      tenant_id: string | null;
    }>(query.limit(10000));
    const [names, classes] = await Promise.all([
      tenantNameMap(db, ctx, rows.map((r) => r.tenant_id || '')),
      classNames(db, ctx, rows.map((r) => r.class_id || '')),
    ]);
    const byClass: Record<string, number> = {};
    for (const r of rows) {
      const label = (r.class_id && classes[r.class_id]) || 'No class';
      byClass[label] = (byClass[label] ?? 0) + 1;
    }
    return {
      data: {
        enrollments: rows.length,
        by_status: countBy(rows, (r) => r.status),
        top_classes: Object.fromEntries(topEntries(byClass, 10)),
        by_branch: labelTenants(countBy(rows, (r) => r.tenant_id), names),
        truncated,
      },
      scope: scopeInfo(ctx, period),
      chart: {
        type: 'bar',
        title: 'Enrollments by class',
        data: topEntries(byClass, 10).map(([label, value]) => ({ label, enrollments: value })),
        series: [{ key: 'enrollments', label: 'Enrollments' }],
      },
      links: [{ label: 'Students', href: '/students' }],
      notes: teacherNote(ctx),
    };
  },
};

const getAttendanceSummary: ToolDefinition = {
  name: 'get_attendance_summary',
  module: 'academic',
  description:
    'Student attendance in the period: totals by status, attendance rate, best and worst classes, and daily trend.',
  parameters: { type: 'object', properties: { ...PERIOD_PARAMS } },
  async execute(args, ctx, db) {
    const period = periodFrom(args, 'this_month');
    const { rows, truncated } = await loadStudentAttendance(db, ctx, period);
    const overall = attendanceOf(rows);

    const studentIds = [...new Set(rows.map((r) => r.person_id))].slice(0, 2000);
    const classOf: Record<string, string | null> = {};
    for (let i = 0; i < studentIds.length; i += 200) {
      const { data } = await scoped(db.from('students').select('id, class_id'), ctx).in(
        'id',
        studentIds.slice(i, i + 200)
      );
      for (const s of (data ?? []) as { id: string; class_id: string | null }[]) classOf[s.id] = s.class_id;
    }
    const classes = await classNames(db, ctx, Object.values(classOf).filter(Boolean) as string[]);
    const perClass: Record<string, { marked: number; attended: number }> = {};
    const perDay: Record<string, { marked: number; attended: number }> = {};
    for (const r of rows) {
      const cls = classOf[r.person_id];
      const label = (cls && classes[cls]) || 'No class';
      const attended = r.status === 'present' || r.status === 'late' ? 1 : 0;
      perClass[label] = { marked: (perClass[label]?.marked ?? 0) + 1, attended: (perClass[label]?.attended ?? 0) + attended };
      perDay[r.date] = { marked: (perDay[r.date]?.marked ?? 0) + 1, attended: (perDay[r.date]?.attended ?? 0) + attended };
    }
    const classRates = Object.entries(perClass)
      .filter(([, v]) => v.marked >= 5)
      .map(([label, v]) => ({ class: label, rate: pct(v.attended, v.marked), records: v.marked }))
      .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));

    return {
      data: {
        records: overall.marked,
        attended: overall.attended,
        attendance_rate_percent: pct(overall.attended, overall.marked),
        by_status: overall.status,
        highest_attendance_classes: classRates.slice(0, 5),
        lowest_attendance_classes: classRates.slice(-5).reverse(),
        truncated,
      },
      scope: scopeInfo(ctx, period, {
        basis: 'Attendance rate = (present + late) / all marked records. Excused and half-day are not counted as attended.',
      }),
      chart: {
        type: 'line',
        title: 'Daily attendance rate (%)',
        data: Object.entries(perDay)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([label, v]) => ({ label, rate: pct(v.attended, v.marked) ?? 0 })),
        series: [{ key: 'rate', label: 'Attendance %' }],
        valueFormat: 'percent',
      },
      links: [{ label: 'Attendance', href: '/attendance' }],
      notes: [
        ...teacherNote(ctx),
        ...(overall.marked === 0 ? ['No student attendance was recorded in this period.'] : []),
      ],
    };
  },
};

const getLowAttendanceStudents: ToolDefinition = {
  name: 'get_low_attendance_students',
  module: 'academic',
  description:
    'Students whose attendance rate in the period is below a threshold (default 75%). Requires at least 3 marked days.',
  parameters: {
    type: 'object',
    properties: {
      ...PERIOD_PARAMS,
      threshold_percent: { type: 'integer', minimum: 1, maximum: 100, description: 'Default 75.' },
      limit: { type: 'integer', minimum: 1, maximum: 25, description: 'Max students to list. Default 10.' },
    },
  },
  async execute(args, ctx, db) {
    const period = periodFrom(args, 'last_30_days');
    const threshold = num(args.threshold_percent) || 75;
    const limit = num(args.limit) || 10;
    const { rows, truncated } = await loadStudentAttendance(db, ctx, period);
    const per: Record<string, { marked: number; attended: number }> = {};
    for (const r of rows) {
      const attended = r.status === 'present' || r.status === 'late' ? 1 : 0;
      per[r.person_id] = { marked: (per[r.person_id]?.marked ?? 0) + 1, attended: (per[r.person_id]?.attended ?? 0) + attended };
    }
    const low = Object.entries(per)
      .filter(([, v]) => v.marked >= 3)
      .map(([id, v]) => ({ id, rate: pct(v.attended, v.marked) ?? 0, marked: v.marked }))
      .filter((s) => s.rate < threshold)
      .sort((a, b) => a.rate - b.rate);
    const listed = low.slice(0, limit);
    const { data } = listed.length
      ? await scoped(db.from('students').select('id, full_name, class_id'), ctx).in('id', listed.map((s) => s.id))
      : { data: [] };
    const info: Record<string, { full_name: string | null; class_id: string | null }> = {};
    for (const s of (data ?? []) as { id: string; full_name: string | null; class_id: string | null }[]) info[s.id] = s;
    const classes = await classNames(db, ctx, Object.values(info).map((s) => s.class_id || ''));
    return {
      data: {
        threshold_percent: threshold,
        students_below_threshold: low.length,
        students: listed.map((s) => ({
          name: info[s.id]?.full_name || 'Unknown student',
          class: (info[s.id]?.class_id && classes[info[s.id].class_id as string]) || null,
          attendance_rate_percent: s.rate,
          marked_days: s.marked,
        })),
        truncated,
      },
      scope: scopeInfo(ctx, period, { basis: 'Rate = (present + late) / marked days.' }),
      links: [{ label: 'Attendance', href: '/attendance' }],
      notes: teacherNote(ctx),
    };
  },
};

const getExamResultsSummary: ToolDefinition = {
  name: 'get_exam_results_summary',
  module: 'academic',
  description:
    'Pass/fail counts and average score per exam. Set latest_exam=true for the most recent exam; otherwise exams dated in the period.',
  parameters: {
    type: 'object',
    properties: {
      ...PERIOD_PARAMS,
      latest_exam: { type: 'boolean', description: 'Only the most recent exam held on or before today.' },
    },
  },
  async execute(args, ctx, db) {
    const period = periodFrom(args, 'this_year');
    const classIds = await teacherClassIds(db, ctx);
    let examQuery = scoped(
      db.from('exams').select('id, name, exam_type, exam_date, total_marks, passing_marks, status, class_id'),
      ctx
    );
    if (classIds) examQuery = examQuery.in('class_id', idsOrNil(classIds));
    examQuery = args.latest_exam
      ? examQuery.lte('exam_date', toISODate(new Date())).order('exam_date', { ascending: false }).limit(1)
      : examQuery.gte('exam_date', period.from).lte('exam_date', period.to).order('exam_date', { ascending: false }).limit(50);
    const { rows: exams } = await fetchRows<{
      id: string;
      name: string;
      exam_type: string | null;
      exam_date: string | null;
      total_marks: number | null;
      passing_marks: number | null;
    }>(examQuery, 50);

    const { rows: grades } = exams.length
      ? await fetchRows<{ exam_id: string; score: number | null; max_score: number | null; percentage: number | null }>(
          scoped(db.from('grades').select('exam_id, score, max_score, percentage'), ctx)
            .in('exam_id', exams.map((e) => e.id))
            .limit(10000)
        )
      : { rows: [] };

    const results = exams.map((exam) => {
      const g = grades.filter((row) => row.exam_id === exam.id && row.score !== null);
      const hasPassMark = exam.passing_marks !== null && exam.passing_marks !== undefined;
      const passed = hasPassMark ? g.filter((row) => num(row.score) >= num(exam.passing_marks)).length : null;
      const percents = g
        .map((row) =>
          row.percentage !== null ? num(row.percentage) : num(row.max_score) > 0 ? (num(row.score) / num(row.max_score)) * 100 : null
        )
        .filter((v): v is number => v !== null);
      return {
        exam: exam.name,
        type: exam.exam_type,
        date: exam.exam_date,
        graded_students: g.length,
        passed,
        failed: passed === null ? null : g.length - passed,
        pass_rate_percent: passed === null ? null : pct(passed, g.length),
        average_percent: percents.length ? Math.round((percents.reduce((a, b) => a + b, 0) / percents.length) * 10) / 10 : null,
        passing_marks: exam.passing_marks,
        total_marks: exam.total_marks,
      };
    });

    return {
      data: { exams: results, exam_count: results.length },
      scope: scopeInfo(ctx, args.latest_exam ? undefined : period, {
        basis: "Passed = score ≥ the exam's passing marks.",
      }),
      chart: results.length
        ? {
            type: 'bar',
            title: 'Exam pass / fail',
            data: results.slice(0, 10).map((r) => ({ label: r.exam, passed: r.passed ?? 0, failed: r.failed ?? 0 })),
            series: [
              { key: 'passed', label: 'Passed' },
              { key: 'failed', label: 'Failed' },
            ],
          }
        : undefined,
      links: [{ label: 'Results', href: '/grades' }],
      notes: [...teacherNote(ctx), ...(results.length === 0 ? ['No exams found for this selection.'] : [])],
    };
  },
};

const getCourseEnrollmentSummary: ToolDefinition = {
  name: 'get_course_enrollment_summary',
  module: 'academic',
  description: 'Courses ranked by number of enrolled students (students.course_ids), with course status.',
  parameters: {
    type: 'object',
    properties: { limit: { type: 'integer', minimum: 1, maximum: 25, description: 'Default 10.' } },
  },
  async execute(args, ctx, db) {
    const limit = num(args.limit) || 10;
    let courseQuery = scoped(db.from('courses').select('id, name, code, status'), ctx);
    if (ctx.role === 'teacher') courseQuery = courseQuery.eq('teacher_id', ctx.userId);
    const [{ rows: courses }, { rows: students, truncated }] = await Promise.all([
      fetchRows<{ id: string; name: string; code: string | null; status: string | null }>(courseQuery.limit(1000), 1000),
      fetchRows<{ course_ids: string[] | null; status: string | null }>(
        scoped(db.from('students').select('course_ids, status'), ctx).limit(10000)
      ),
    ]);
    const counts: Record<string, number> = {};
    for (const s of students) for (const id of s.course_ids ?? []) counts[id] = (counts[id] ?? 0) + 1;
    const ranked = courses
      .map((c) => ({ course: c.name, code: c.code, status: c.status, enrolled_students: counts[c.id] ?? 0 }))
      .sort((a, b) => b.enrolled_students - a.enrolled_students);
    return {
      data: { course_count: courses.length, top_courses: ranked.slice(0, limit), truncated },
      scope: scopeInfo(ctx, undefined, { basis: 'Counts students whose course list includes the course (all statuses).' }),
      chart: {
        type: 'bar',
        title: 'Students per course',
        data: ranked.slice(0, limit).map((r) => ({ label: r.course, students: r.enrolled_students })),
        series: [{ key: 'students', label: 'Students' }],
      },
      links: [{ label: 'Courses', href: '/courses' }],
      notes: ctx.role === 'teacher' ? ['Limited to courses assigned to you.'] : [],
    };
  },
};

export const academicTools: ToolDefinition[] = [
  getStudentCount,
  getEnrollmentSummary,
  getAttendanceSummary,
  getLowAttendanceStudents,
  getExamResultsSummary,
  getCourseEnrollmentSummary,
];
