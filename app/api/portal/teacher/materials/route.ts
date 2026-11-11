import { NextResponse } from 'next/server';
import { requirePortalUser, safeRow } from '@/lib/portal-api';

type ClassRow = { id: string; tenant_id: string | null; teacher_id: string | null };
type ClassSubjectRow = { class_id: string };

export async function POST(request: Request) {
  const auth = await requirePortalUser((role) => role === 'teacher');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { admin, user } = auth;

  try {
    const body = (await request.json()) as {
      classId?: string;
      subjectId?: string;
      title?: string;
      objectives?: string;
      materials?: string;
      assessment?: string;
      lessonDate?: string;
      durationMinutes?: number | string;
    };

    const classId = String(body.classId ?? '').trim();
    const title = String(body.title ?? '').trim();
    const subjectId = String(body.subjectId ?? '').trim() || null;
    const lessonDate = String(body.lessonDate ?? '').trim() || null;
    const durationRaw =
      body.durationMinutes == null || body.durationMinutes === ''
        ? null
        : Number(body.durationMinutes);

    if (!classId || !title) {
      return NextResponse.json({ error: 'Class and title are required' }, { status: 400 });
    }
    if (durationRaw != null && (!Number.isFinite(durationRaw) || durationRaw <= 0)) {
      return NextResponse.json({ error: 'Duration must be a positive number' }, { status: 400 });
    }

    const teacher = await safeRow<{ id: string }>(
      admin.from('teachers').select('id').eq('profile_id', user.id).limit(1).maybeSingle()
    );
    const teacherIds = [user.id, teacher?.id].filter((value): value is string => Boolean(value));

    const [ownedClass, assignedClass] = await Promise.all([
      safeRow<ClassRow>(
        admin
          .from('classes')
          .select('id, tenant_id, teacher_id')
          .eq('id', classId)
          .in('teacher_id', teacherIds)
          .maybeSingle()
      ),
      safeRow<ClassSubjectRow>(
        admin
          .from('class_subjects')
          .select('class_id')
          .eq('class_id', classId)
          .in('teacher_id', teacherIds)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
      ),
    ]);

    if (!ownedClass && !assignedClass) {
      return NextResponse.json({ error: 'You are not assigned to this class' }, { status: 403 });
    }

    const classRow =
      ownedClass ??
      (await safeRow<ClassRow>(
        admin.from('classes').select('id, tenant_id, teacher_id').eq('id', classId).maybeSingle()
      ));

    if (subjectId) {
      const subjectLink = await safeRow<ClassSubjectRow>(
        admin
          .from('class_subjects')
          .select('class_id')
          .eq('class_id', classId)
          .eq('subject_id', subjectId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
      );
      if (!subjectLink) {
        return NextResponse.json(
          { error: 'That subject is not assigned to this class' },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('lesson_plans')
      .insert({
        tenant_id: classRow?.tenant_id ?? user.tenantId,
        teacher_id: user.id,
        class_id: classId,
        subject_id: subjectId,
        title,
        objectives: String(body.objectives ?? '').trim() || null,
        materials: String(body.materials ?? '').trim() || null,
        assessment: String(body.assessment ?? '').trim() || null,
        lesson_date: lessonDate,
        duration_minutes: durationRaw,
        status: 'draft',
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create learning material';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
