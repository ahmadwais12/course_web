import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Grades list — prefers `grades` (+ student/exam), falls back to `student_grades` / `exam_results`.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const primary = await supabase
      .from('grades')
      .select(
        `
        id,
        subject,
        score,
        max_score,
        percentage,
        grade,
        grade_point,
        status,
        remarks,
        created_at,
        student:students ( id, full_name, student_code ),
        exam:exams ( id, name, exam_type, exam_date )
      `
      )
      .order('created_at', { ascending: false })
      .limit(300);

    if (!primary.error && primary.data) {
      const rows = primary.data.map((g) => {
        const student = Array.isArray(g.student) ? g.student[0] : g.student;
        const exam = Array.isArray(g.exam) ? g.exam[0] : g.exam;
        return {
          id: g.id,
          student_name: student?.full_name ?? '—',
          student_code: student?.student_code ?? null,
          subject: g.subject ?? exam?.name ?? '—',
          exam_name: exam?.name ?? null,
          exam_type: exam?.exam_type ?? null,
          exam_date: exam?.exam_date ?? null,
          score: g.score,
          max_score: g.max_score ?? 100,
          percentage: g.percentage ?? (g.score != null ? (Number(g.score) / Number(g.max_score || 100)) * 100 : null),
          letter: g.grade,
          grade_point: g.grade_point,
          status: g.status ?? 'pending',
          remarks: g.remarks,
        };
      });
      return NextResponse.json(rows);
    }

    const fallback = await supabase
      .from('student_grades')
      .select('id, student_id, subject, score, max_score, percentage, grade, exam_type, exam_date, comments, created_at')
      .order('created_at', { ascending: false })
      .limit(300);

    if (!fallback.error && fallback.data) {
      const studentIds = [...new Set(fallback.data.map((r) => r.student_id).filter(Boolean))];
      const { data: students } = studentIds.length
        ? await supabase.from('students').select('id, full_name, student_code').in('id', studentIds)
        : { data: [] as { id: string; full_name: string; student_code: string }[] };
      const byId = new Map((students ?? []).map((s) => [s.id, s]));

      const rows = fallback.data.map((g) => {
        const s = g.student_id ? byId.get(g.student_id) : undefined;
        return {
          id: g.id,
          student_name: s?.full_name ?? '—',
          student_code: s?.student_code ?? null,
          subject: g.subject,
          exam_name: g.subject,
          exam_type: g.exam_type,
          exam_date: g.exam_date,
          score: g.score,
          max_score: g.max_score ?? 100,
          percentage: g.percentage,
          letter: g.grade,
          grade_point: null,
          status: 'graded',
          remarks: g.comments,
        };
      });
      return NextResponse.json(rows);
    }

    return NextResponse.json([]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch grades';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function letterFromPercent(pct: number): string {
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}

/** Create grade — tries `grades`, then `student_grades` */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const studentId = String(body.student_id ?? '').trim();
    const subject = String(body.subject ?? '').trim();
    const score = Number(body.score);
    const maxScore = Number(body.max_score ?? 100) || 100;
    const examType = body.exam_type ? String(body.exam_type) : null;
    const examDate = body.exam_date ? String(body.exam_date) : null;
    const remarks = body.remarks ? String(body.remarks) : null;
    const status = String(body.status ?? 'graded');

    if (!studentId || !subject || Number.isNaN(score)) {
      return NextResponse.json(
        { error: 'student_id, subject, and score are required' },
        { status: 400 }
      );
    }

    const percentage = Math.round((score / maxScore) * 1000) / 10;
    const letter = String(body.grade ?? body.letter ?? letterFromPercent(percentage));

    const supabase = await createClient();

    // Prefer main grades table (exam_id optional)
    const primary = await supabase
      .from('grades')
      .insert({
        student_id: studentId,
        subject,
        score,
        max_score: maxScore,
        percentage,
        grade: letter,
        status,
        remarks,
      })
      .select('id')
      .single();

    if (!primary.error && primary.data) {
      return NextResponse.json({ id: primary.data.id, message: 'Grade added' }, { status: 201 });
    }

    const fallback = await supabase
      .from('student_grades')
      .insert({
        student_id: studentId,
        subject,
        score,
        max_score: maxScore,
        percentage,
        grade: letter,
        exam_type: examType,
        exam_date: examDate,
        comments: remarks,
      })
      .select('id')
      .single();

    if (fallback.error) {
      return NextResponse.json(
        { error: fallback.error.message || primary.error?.message || 'Failed to add grade' },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: fallback.data.id, message: 'Grade added' }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add grade';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

