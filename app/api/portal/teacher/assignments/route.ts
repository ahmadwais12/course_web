import { NextResponse } from 'next/server';
import { requirePortalUser, safeRow } from '@/lib/portal-api';

type ClassRow = { id: string; tenant_id: string | null; teacher_id: string | null };
type ClassSubjectRow = { class_id: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  const auth = await requirePortalUser((role) => role === 'teacher');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { admin, user } = auth;

  try {
    const body = (await request.json()) as {
      classId?: string;
      subjectId?: string;
      title?: string;
      description?: string;
      dueDate?: string;
      maxMarks?: number | string;
    };

    const classId = String(body.classId ?? '').trim();
    const title = String(body.title ?? '').trim();
    const dueDate = String(body.dueDate ?? '').trim();
    const description = String(body.description ?? '').trim();
    const subjectId = String(body.subjectId ?? '').trim() || null;
    const maxMarksRaw = body.maxMarks == null || body.maxMarks === '' ? null : Number(body.maxMarks);

    if (!classId || !title || !dueDate) {
      return NextResponse.json(
        { error: 'Class, title, and due date are required' },
        { status: 400 }
      );
    }
    if (!DATE_RE.test(dueDate)) {
      return NextResponse.json({ error: 'A valid due date is required' }, { status: 400 });
    }
    if (maxMarksRaw != null && (!Number.isFinite(maxMarksRaw) || maxMarksRaw < 0)) {
      return NextResponse.json({ error: 'Max marks must be a positive number' }, { status: 400 });
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
      .from('homework')
      .insert({
        tenant_id: classRow?.tenant_id ?? user.tenantId,
        class_id: classId,
        subject_id: subjectId,
        teacher_id: user.id,
        title,
        description: description || null,
        assigned_date: now.slice(0, 10),
        due_date: dueDate,
        max_marks: maxMarksRaw,
        status: 'active',
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
    const message = error instanceof Error ? error.message : 'Failed to create assignment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
