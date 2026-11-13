import { NextResponse } from 'next/server';
import { requirePortalUser, safeRow } from '@/lib/portal-api';

type StudentRow = { id: string; class_id: string | null; tenant_id: string | null };
type HomeworkRow = {
  id: string;
  class_id: string | null;
  tenant_id: string | null;
  due_date: string | null;
  status: string | null;
};
type SubmissionRow = { id: string; status: string | null };

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const MAX_BYTES = 10 * 1024 * 1024;

/** Database trigger misconfiguration is not actionable by the student. */
function statusCodeFor(error: { code?: string }) {
  return error.code === '42702' || error.code === '42P01' ? 503 : 500;
}

function submissionErrorMessage(error: { code?: string; message: string }) {
  if (error.code === '42702') {
    return 'Submissions are temporarily unavailable. Please contact the administrator.';
  }
  return error.message;
}

export async function POST(request: Request) {
  const auth = await requirePortalUser((role) => role === 'student');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { admin, user } = auth;

  try {
    const form = await request.formData();
    const homeworkId = String(form.get('homeworkId') ?? '').trim();
    const submissionText = String(form.get('submission_text') ?? '').trim();
    const file = form.get('file');

    if (!homeworkId) {
      return NextResponse.json({ error: 'homeworkId is required' }, { status: 400 });
    }

    const [student, homework] = await Promise.all([
      safeRow<StudentRow>(
        admin
          .from('students')
          .select('id, class_id, tenant_id')
          .eq('profile_id', user.id)
          .limit(1)
          .maybeSingle()
      ),
      safeRow<HomeworkRow>(
        admin
          .from('homework')
          .select('id, class_id, tenant_id, due_date, status')
          .eq('id', homeworkId)
          .maybeSingle()
      ),
    ]);

    if (!student) {
      return NextResponse.json({ error: 'No student record is linked to this account' }, { status: 403 });
    }
    if (!homework) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }
    if (!student.class_id || homework.class_id !== student.class_id) {
      return NextResponse.json({ error: 'This assignment is not for your class' }, { status: 403 });
    }
    if (homework.status === 'cancelled' || homework.status === 'draft') {
      return NextResponse.json({ error: 'This assignment is not open for submission' }, { status: 409 });
    }

    const existing = await safeRow<SubmissionRow>(
      admin
        .from('homework_submissions')
        .select('id, status')
        .eq('homework_id', homeworkId)
        .eq('student_id', student.id)
        .limit(1)
        .maybeSingle()
    );
    if (existing?.status === 'graded') {
      return NextResponse.json(
        { error: 'This assignment has already been graded and cannot be resubmitted' },
        { status: 409 }
      );
    }

    let submissionUrl: string | null = null;
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'Attachment must be 10 MB or smaller' }, { status: 400 });
      }
      if (file.type && !ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json({ error: 'This file type is not allowed' }, { status: 400 });
      }
      const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'bin';
      const path = `portal/assignments/${homeworkId}/${student.id}-${Date.now()}.${extension}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await admin.storage
        .from('branding')
        .upload(path, buffer, { contentType: file.type || 'application/octet-stream', upsert: true });
      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }
      const { data: publicUrl } = admin.storage.from('branding').getPublicUrl(path);
      submissionUrl = publicUrl.publicUrl;
    }

    if (!submissionText && !submissionUrl && !existing) {
      return NextResponse.json(
        { error: 'Add a note or attach a file before submitting' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const status = homework.due_date && today > homework.due_date ? 'late' : 'submitted';

    if (existing) {
      const { error } = await admin
        .from('homework_submissions')
        .update({
          submission_text: submissionText || null,
          submission_url: submissionUrl ?? undefined,
          submitted_at: now,
          status,
          updated_at: now,
        })
        .eq('id', existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await admin.from('homework_submissions').insert({
        tenant_id: student.tenant_id ?? homework.tenant_id,
        homework_id: homeworkId,
        student_id: student.id,
        submission_text: submissionText || null,
        submission_url: submissionUrl,
        submitted_at: now,
        status,
        created_at: now,
        updated_at: now,
      });
      if (error) {
        return NextResponse.json({ error: submissionErrorMessage(error) }, { status: statusCodeFor(error) });
      }
    }

    return NextResponse.json({ ok: true, status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit assignment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
