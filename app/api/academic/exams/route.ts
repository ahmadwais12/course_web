import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num, str } from '@/lib/portal-api';

type ExamRow = {
  id: string;
  name: string;
  exam_type: string | null;
  subject: string | null;
  class_id: string | null;
  exam_date: string | null;
  start_time: string | null;
  end_time: string | null;
  total_marks: number | null;
  passing_marks: number | null;
  status: string | null;
  description: string | null;
};

type IdRow = { exam_id: string | null };

const TYPES = new Set(['midterm', 'final', 'quiz', 'assignment', 'placement', 'mock']);
const STATUSES = new Set(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled']);

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const examQuery = admin
      .from('exams')
      .select(
        'id, name, exam_type, subject, class_id, exam_date, start_time, end_time, total_marks, passing_marks, status, description'
      )
      .order('exam_date', { ascending: false });
    const classQuery = admin.from('classes').select('id, name').order('name');
    const gradeQuery = admin.from('grades').select('exam_id');
    const [{ data: examData, error }, { data: classData }, { data: gradeData }] = await Promise.all([
      tenantId ? examQuery.eq('tenant_id', tenantId) : examQuery,
      tenantId ? classQuery.eq('tenant_id', tenantId) : classQuery,
      tenantId ? gradeQuery.eq('tenant_id', tenantId) : gradeQuery,
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const classNames = new Map(
      ((classData ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name])
    );
    const graded = new Map<string, number>();
    for (const row of (gradeData ?? []) as IdRow[]) {
      if (row.exam_id) graded.set(row.exam_id, (graded.get(row.exam_id) ?? 0) + 1);
    }

    return NextResponse.json({
      rows: ((examData ?? []) as ExamRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        examType: row.exam_type ?? 'final',
        subject: row.subject,
        classId: row.class_id,
        className: row.class_id ? classNames.get(row.class_id) ?? '—' : '—',
        examDate: row.exam_date,
        startTime: row.start_time,
        endTime: row.end_time,
        totalMarks: num(row.total_marks, 100),
        passingMarks: num(row.passing_marks, 50),
        status: row.status ?? 'scheduled',
        description: row.description,
        grades: graded.get(row.id) ?? 0,
      })),
      classes: ((classData ?? []) as { id: string; name: string }[]).map((row) => ({
        value: row.id,
        label: row.name,
      })),
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load exams');
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId, userId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? '').trim();
    const examType = String(body.examType ?? 'final');
    const status = String(body.status ?? 'scheduled');
    const totalMarks = Number(body.totalMarks ?? 100);
    const passingMarks = Number(body.passingMarks ?? 50);
    const examDate = String(body.examDate ?? '').slice(0, 10);

    if (!name) return NextResponse.json({ error: 'Exam name is required' }, { status: 400 });
    if (!TYPES.has(examType)) return NextResponse.json({ error: 'Invalid exam type' }, { status: 400 });
    if (!STATUSES.has(status)) return NextResponse.json({ error: 'Invalid exam status' }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
      return NextResponse.json({ error: 'Choose an exam date' }, { status: 400 });
    }
    if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
      return NextResponse.json({ error: 'Total marks must be greater than zero' }, { status: 400 });
    }
    if (!Number.isFinite(passingMarks) || passingMarks < 0 || passingMarks > totalMarks) {
      return NextResponse.json({ error: 'Passing marks must be within total marks' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('exams')
      .insert({
        tenant_id: tenantId,
        name,
        exam_type: examType,
        subject: str(body.subject),
        class_id: str(body.classId),
        exam_date: examDate,
        start_time: str(body.startTime),
        end_time: str(body.endTime),
        total_marks: totalMarks,
        passing_marks: passingMarks,
        status,
        description: str(body.description),
        created_by: userId,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: (data as { id: string } | null)?.id ?? null }, { status: 201 });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to create exam');
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const id = str(body.id);
    if (!id) return NextResponse.json({ error: 'Exam id is required' }, { status: 400 });
    const status = str(body.status);
    if (!status || !STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid exam status' }, { status: 400 });
    }

    const update = admin
      .from('exams')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    const { error } = await (tenantId ? update.eq('tenant_id', tenantId) : update);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to update exam');
  }
}
