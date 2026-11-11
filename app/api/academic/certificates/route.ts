import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { str } from '@/lib/portal-api';

type CertificateRow = {
  id: string;
  student_id: string | null;
  certificate_type: string | null;
  course_name: string | null;
  level_achieved: string | null;
  issue_date: string | null;
  certificate_number: string | null;
  certificate_url: string | null;
  status: string | null;
  notes: string | null;
};

const TYPES = new Set(['completion', 'achievement', 'participation', 'merit', 'level']);
const STATUSES = new Set(['draft', 'issued', 'revoked']);

function nextNumber() {
  const year = new Date().getFullYear();
  const suffix = String(Date.now()).slice(-6);
  return `CERT-${year}-${suffix}`;
}

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const certQuery = admin
      .from('certificates')
      .select(
        'id, student_id, certificate_type, course_name, level_achieved, issue_date, certificate_number, certificate_url, status, notes'
      )
      .order('issue_date', { ascending: false });
    const studentQuery = admin.from('students').select('id, student_code, full_name, email').order('full_name');
    const [{ data: certData, error }, { data: studentData }] = await Promise.all([
      tenantId ? certQuery.eq('tenant_id', tenantId) : certQuery,
      tenantId ? studentQuery.eq('tenant_id', tenantId) : studentQuery,
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const students = (studentData ?? []) as {
      id: string;
      student_code: string | null;
      full_name: string | null;
      email: string | null;
    }[];
    const studentMap = new Map(students.map((row) => [row.id, row]));

    return NextResponse.json({
      rows: ((certData ?? []) as CertificateRow[]).map((row) => {
        const student = row.student_id ? studentMap.get(row.student_id) : undefined;
        return {
          id: row.id,
          studentId: row.student_id,
          studentName: student?.full_name ?? '—',
          studentCode: student?.student_code ?? '—',
          certificateType: row.certificate_type ?? 'completion',
          courseName: row.course_name,
          levelAchieved: row.level_achieved,
          issueDate: row.issue_date,
          number: row.certificate_number,
          url: row.certificate_url,
          status: row.status ?? 'issued',
          notes: row.notes,
        };
      }),
      students: students.map((row) => ({
        value: row.id,
        label: `${row.full_name || row.email || 'Student'}${row.student_code ? ` · ${row.student_code}` : ''}`,
      })),
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load certificates');
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId, userId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const studentId = str(body.studentId);
    const certificateType = String(body.certificateType ?? 'completion');
    const status = String(body.status ?? 'issued');
    const issueDate = String(body.issueDate ?? new Date().toISOString().slice(0, 10)).slice(0, 10);

    if (!studentId) return NextResponse.json({ error: 'Choose a student' }, { status: 400 });
    if (!TYPES.has(certificateType)) {
      return NextResponse.json({ error: 'Invalid certificate type' }, { status: 400 });
    }
    if (!STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid certificate status' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDate)) {
      return NextResponse.json({ error: 'Issue date is invalid' }, { status: 400 });
    }

    const number = String(body.number ?? '').trim() || nextNumber();
    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('certificates')
      .insert({
        tenant_id: tenantId,
        student_id: studentId,
        certificate_type: certificateType,
        course_name: str(body.courseName),
        level_achieved: str(body.levelAchieved),
        issue_date: issueDate,
        certificate_number: number,
        certificate_url: str(body.url),
        issued_by: userId,
        status,
        notes: str(body.notes),
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(
      { ok: true, id: (data as { id: string } | null)?.id ?? null, number },
      { status: 201 }
    );
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to issue certificate');
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const id = str(body.id);
    const status = str(body.status);
    if (!id) return NextResponse.json({ error: 'Certificate id is required' }, { status: 400 });
    if (!status || !STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid certificate status' }, { status: 400 });
    }

    const update = admin
      .from('certificates')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    const { error } = await (tenantId ? update.eq('tenant_id', tenantId) : update);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to update certificate');
  }
}
