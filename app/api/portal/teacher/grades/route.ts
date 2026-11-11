import { NextResponse } from 'next/server';
import { requirePortalUser, safeRow } from '@/lib/portal-api';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function letterGrade(percentage: number) {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

export async function POST(request: Request) {
  const auth = await requirePortalUser((role) => role === 'teacher');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { admin, user } = auth;

  try {
    const body = (await request.json()) as {
      studentId?: string;
      classId?: string;
      examName?: string;
      subject?: string;
      score?: number | string;
      maxScore?: number | string;
      examDate?: string;
      comments?: string;
    };

    const studentId = String(body.studentId ?? '').trim();
    const classId = String(body.classId ?? '').trim();
    const examName = String(body.examName ?? '').trim();
    const subject = String(body.subject ?? '').trim() || null;
    const examDate = String(body.examDate ?? '').trim();
    const score = Number(body.score);
    const maxScore = body.maxScore == null || body.maxScore === '' ? 100 : Number(body.maxScore);

    if (!studentId || !classId || !examName) {
      return NextResponse.json(
        { error: 'Student, class, and examination name are required' },
        { status: 400 }
      );
    }
    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      return NextResponse.json({ error: 'Maximum marks must be greater than zero' }, { status: 400 });
    }
    if (!Number.isFinite(score) || score < 0 || score > maxScore) {
      return NextResponse.json(
        { error: `Score must be between 0 and ${maxScore}` },
        { status: 400 }
      );
    }
    if (examDate && !DATE_RE.test(examDate)) {
      return NextResponse.json({ error: 'A valid exam date is required' }, { status: 400 });
    }

    const teacher = await safeRow<{ id: string }>(
      admin.from('teachers').select('id').eq('profile_id', user.id).limit(1).maybeSingle()
    );
    const teacherIds = [user.id, teacher?.id].filter((value): value is string => Boolean(value));

    const [ownedClass, assignedClass, student] = await Promise.all([
      safeRow<{ id: string }>(
        admin
          .from('classes')
          .select('id')
          .eq('id', classId)
          .in('teacher_id', teacherIds)
          .maybeSingle()
      ),
      safeRow<{ id: string }>(
        admin
          .from('class_subjects')
          .select('id')
          .eq('class_id', classId)
          .in('teacher_id', teacherIds)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
      ),
      safeRow<{ id: string; class_id: string | null }>(
        admin.from('students').select('id, class_id').eq('id', studentId).maybeSingle()
      ),
    ]);

    if (!ownedClass && !assignedClass) {
      return NextResponse.json({ error: 'You are not assigned to this class' }, { status: 403 });
    }
    if (!student || student.class_id !== classId) {
      return NextResponse.json({ error: 'That student is not in this class' }, { status: 403 });
    }

    const percentage = Math.round((score / maxScore) * 10000) / 100;
    const now = new Date().toISOString();

    const { data, error } = await admin
      .from('exam_results')
      .insert({
        student_id: studentId,
        exam_name: examName,
        subject,
        score,
        max_score: maxScore,
        percentage,
        grade: letterGrade(percentage),
        exam_date: examDate || now.slice(0, 10),
        class_id: classId,
        teacher_id: user.id,
        comments: String(body.comments ?? '').trim() || null,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, id: (data as { id: string }).id, percentage });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save marks';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
