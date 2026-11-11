import { NextResponse } from 'next/server';
import { requirePortalUser, safeRow } from '@/lib/portal-api';

type SubmissionRow = {
  id: string;
  homework_id: string;
  student_id: string;
  marks_obtained: number | null;
  status: string | null;
};
type HomeworkRow = {
  id: string;
  class_id: string | null;
  teacher_id: string | null;
  title: string;
  max_marks: number | null;
};

export async function POST(request: Request) {
  const auth = await requirePortalUser((role) => role === 'teacher');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { admin, user } = auth;

  try {
    const body = (await request.json()) as {
      submissionId?: string;
      marksObtained?: number | string;
      feedback?: string;
    };

    const submissionId = String(body.submissionId ?? '').trim();
    const feedback = String(body.feedback ?? '').trim();
    const marksRaw = body.marksObtained === '' || body.marksObtained == null ? null : Number(body.marksObtained);

    if (!submissionId) {
      return NextResponse.json({ error: 'A submission is required' }, { status: 400 });
    }
    if (marksRaw != null && (!Number.isFinite(marksRaw) || marksRaw < 0)) {
      return NextResponse.json({ error: 'Marks must be a positive number' }, { status: 400 });
    }

    const submission = await safeRow<SubmissionRow>(
      admin
        .from('homework_submissions')
        .select('id, homework_id, student_id, marks_obtained, status')
        .eq('id', submissionId)
        .maybeSingle()
    );
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const homework = await safeRow<HomeworkRow>(
      admin
        .from('homework')
        .select('id, class_id, teacher_id, title, max_marks')
        .eq('id', submission.homework_id)
        .maybeSingle()
    );
    if (!homework) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const teacher = await safeRow<{ id: string }>(
      admin.from('teachers').select('id').eq('profile_id', user.id).limit(1).maybeSingle()
    );
    const teacherIds = [user.id, teacher?.id].filter((value): value is string => Boolean(value));

    const ownedClass = homework.class_id
      ? await safeRow<{ id: string }>(
          admin
            .from('classes')
            .select('id')
            .eq('id', homework.class_id)
            .in('teacher_id', teacherIds)
            .maybeSingle()
        )
      : null;
    const assignedClass = homework.class_id
      ? await safeRow<{ id: string }>(
          admin
            .from('class_subjects')
            .select('id')
            .eq('class_id', homework.class_id)
            .in('teacher_id', teacherIds)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle()
        )
      : null;

    if (!ownedClass && !assignedClass && !teacherIds.includes(homework.teacher_id ?? '')) {
      return NextResponse.json({ error: 'You cannot grade this submission' }, { status: 403 });
    }

    if (marksRaw != null && homework.max_marks != null && marksRaw > Number(homework.max_marks)) {
      return NextResponse.json(
        { error: `Marks cannot exceed ${homework.max_marks}` },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from('homework_submissions')
      .update({
        marks_obtained: marksRaw,
        feedback: feedback || null,
        status: 'graded',
        graded_by: user.id,
        graded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to grade submission';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
