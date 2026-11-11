import { NextResponse } from 'next/server';
import { requirePortalUser, safeRow } from '@/lib/portal-api';

const CERTIFICATE_TYPES = new Set([
  'completion',
  'achievement',
  'participation',
  'merit',
  'level',
]);

type StudentRow = { id: string; class_id: string | null; program_id: string | null };
type ClassRow = { id: string; name: string | null; program_id: string | null };
type ProgramRow = { id: string; name: string | null };

export async function POST(request: Request) {
  const auth = await requirePortalUser((role) => role === 'student');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { admin, user } = auth;

  try {
    const body = (await request.json()) as {
      certificateType?: string;
      courseName?: string;
      notes?: string;
    };

    const certificateType = String(body.certificateType ?? '').trim().toLowerCase();
    if (!CERTIFICATE_TYPES.has(certificateType)) {
      return NextResponse.json({ error: 'Choose a valid certificate type' }, { status: 400 });
    }

    const student = await safeRow<StudentRow>(
      admin
        .from('students')
        .select('id, class_id, program_id')
        .eq('profile_id', user.id)
        .limit(1)
        .maybeSingle()
    );
    if (!student) {
      return NextResponse.json(
        { error: 'No student record is linked to this account' },
        { status: 404 }
      );
    }

    let courseName = String(body.courseName ?? '').trim() || null;
    if (!courseName && student.class_id) {
      const classRow = await safeRow<ClassRow>(
        admin.from('classes').select('id, name, program_id').eq('id', student.class_id).maybeSingle()
      );
      const programId = classRow?.program_id || student.program_id;
      if (programId) {
        const program = await safeRow<ProgramRow>(
          admin.from('programs').select('id, name').eq('id', programId).maybeSingle()
        );
        courseName = program?.name ?? null;
      }
      courseName = courseName ?? classRow?.name ?? null;
    }

    const notes = String(body.notes ?? '').trim();

    const { data, error } = await admin
      .from('certificates')
      .insert({
        tenant_id: user.tenantId,
        student_id: student.id,
        certificate_type: certificateType,
        course_name: courseName,
        status: 'draft',
        notes: notes || 'Requested by student through the portal',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to submit certificate request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
