import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num, str } from '@/lib/portal-api';

type ExamRow = {
  id: string;
  name: string;
  class_id: string | null;
  exam_date: string | null;
  status: string | null;
  passing_marks: number | null;
  total_marks: number | null;
};

type GradeRow = {
  exam_id: string | null;
  class_id: string | null;
  student_id: string | null;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  grade: string | null;
};

type EnrollmentRow = { status: string | null };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function percentage(row: GradeRow) {
  if (row.percentage != null) return num(row.percentage);
  const max = num(row.max_score, 100);
  return max > 0 ? (num(row.score) / max) * 100 : 0;
}

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const [examsRes, gradesRes, classesRes, subjectsRes, enrollmentsRes] = await Promise.all([
      (() => {
        const query = admin
          .from('exams')
          .select('id, name, class_id, exam_date, status, passing_marks, total_marks');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin
          .from('grades')
          .select('exam_id, class_id, student_id, score, max_score, percentage, grade');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin.from('classes').select('id, name');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin.from('subjects').select('id');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin.from('student_enrollments').select('status');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
    ]);

    const exams = (examsRes.data ?? []) as ExamRow[];
    const grades = (gradesRes.data ?? []) as GradeRow[];
    const classes = (classesRes.data ?? []) as { id: string; name: string }[];
    const className = new Map(classes.map((row) => [row.id, row.name]));
    const examById = new Map(exams.map((row) => [row.id, row]));

    const percentages = grades.map(percentage);
    const avgPercentage = percentages.length
      ? percentages.reduce((sum, value) => sum + value, 0) / percentages.length
      : 0;

    let passed = 0;
    for (const grade of grades) {
      const exam = grade.exam_id ? examById.get(grade.exam_id) : undefined;
      const passMark = exam
        ? (num(exam.passing_marks, 50) / Math.max(1, num(exam.total_marks, 100))) * 100
        : 50;
      if (percentage(grade) >= passMark) passed += 1;
    }
    const passRate = grades.length ? (passed / grades.length) * 100 : 0;

    const now = new Date();
    const monthly: { key: string; label: string; average: number; graded: number }[] = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      monthly.push({ key: monthKey(date), label: MONTHS[date.getMonth()], average: 0, graded: 0 });
    }
    const monthIndex = new Map(monthly.map((month, index) => [month.key, index]));
    for (const grade of grades) {
      const exam = grade.exam_id ? examById.get(grade.exam_id) : undefined;
      const index = monthIndex.get(String(exam?.exam_date ?? '').slice(0, 7));
      if (index === undefined) continue;
      monthly[index].average += percentage(grade);
      monthly[index].graded += 1;
    }
    for (const month of monthly) {
      month.average = month.graded ? Math.round((month.average / month.graded) * 10) / 10 : 0;
    }

    const byClass = new Map<string, { total: number; count: number; students: Set<string> }>();
    for (const grade of grades) {
      const key = grade.class_id ?? 'unassigned';
      const bucket = byClass.get(key) ?? { total: 0, count: 0, students: new Set<string>() };
      bucket.total += percentage(grade);
      bucket.count += 1;
      if (grade.student_id) bucket.students.add(grade.student_id);
      byClass.set(key, bucket);
    }
    const classPerformance = [...byClass.entries()]
      .map(([id, bucket]) => ({
        id,
        name: id === 'unassigned' ? 'Unassigned' : className.get(id) ?? '—',
        average: bucket.count ? Math.round((bucket.total / bucket.count) * 10) / 10 : 0,
        students: bucket.students.size,
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 8);

    const distribution = new Map<string, number>();
    for (const grade of grades) {
      const label = (str(grade.grade) || letterFor(percentage(grade))).toUpperCase();
      distribution.set(label, (distribution.get(label) ?? 0) + 1);
    }

    const enrollments = (enrollmentsRes.data ?? []) as EnrollmentRow[];

    return NextResponse.json({
      summary: {
        exams: exams.length,
        completedExams: exams.filter((row) => row.status === 'completed').length,
        avgPercentage: Math.round(avgPercentage * 10) / 10,
        passRate: Math.round(passRate * 10) / 10,
        subjects: (subjectsRes.data ?? []).length,
        activeEnrollments: enrollments.filter((row) => (row.status ?? 'active') === 'active').length,
        graded: grades.length,
      },
      monthly,
      classPerformance,
      gradeDistribution: [...distribution.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load academic report');
  }
}

function letterFor(value: number) {
  if (value >= 90) return 'A';
  if (value >= 80) return 'B';
  if (value >= 70) return 'C';
  if (value >= 60) return 'D';
  return 'F';
}
