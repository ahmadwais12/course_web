import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { str } from '@/lib/portal-api';

type AffairRow = {
  id: string;
  student_id: string;
  enrollment_status: string | null;
  admission_date: string | null;
  notes: string | null;
  updated_at: string | null;
};

type StudentRow = {
  id: string;
  student_code: string | null;
  full_name: string | null;
  email: string | null;
  status: string | null;
};

type TransferMeta = {
  direction?: 'in' | 'out';
  from?: string;
  to?: string;
  reason?: string;
  date?: string;
};

function parseNotes(notes: string | null): TransferMeta {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes) as TransferMeta;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return { reason: notes };
  }
}

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const affairQuery = admin
      .from('student_affairs')
      .select('id, student_id, enrollment_status, admission_date, notes, updated_at')
      .eq('enrollment_status', 'transferred')
      .order('updated_at', { ascending: false });
    const [{ data: affairData, error }, { data: studentData }] = await Promise.all([
      affairQuery,
      admin.from('students').select('id, student_code, full_name, email, status').order('full_name'),
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const students = (studentData ?? []) as StudentRow[];
    const studentMap = new Map(students.map((row) => [row.id, row]));

    const records = ((affairData ?? []) as AffairRow[]).map((row) => {
      const meta = parseNotes(row.notes);
      const student = studentMap.get(row.student_id);
      return {
        id: row.id,
        studentId: row.student_id,
        studentName: student?.full_name ?? '—',
        studentCode: student?.student_code ?? '—',
        direction: meta.direction ?? 'out',
        from: meta.from ?? '',
        to: meta.to ?? '',
        reason: meta.reason ?? '',
        date: meta.date ?? row.admission_date,
        status: 'transferred',
        updatedAt: row.updated_at,
      };
    });

    const recorded = new Set(records.map((row) => row.studentId));
    const pending = students
      .filter((row) => row.status === 'transferred' && !recorded.has(row.id))
      .map((row) => ({
        id: `student-${row.id}`,
        studentId: row.id,
        studentName: row.full_name ?? '—',
        studentCode: row.student_code ?? '—',
        direction: 'out' as const,
        from: '',
        to: '',
        reason: 'Marked transferred on the student record',
        date: null,
        status: 'transferred',
        updatedAt: null,
      }));

    return NextResponse.json({
      rows: [...records, ...pending],
      students: students.map((row) => ({
        value: row.id,
        label: `${row.full_name || row.email || 'Student'}${row.student_code ? ` · ${row.student_code}` : ''}`,
      })),
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load transfers');
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const studentId = str(body.studentId);
    const direction = body.direction === 'in' ? 'in' : 'out';
    const date = String(body.date ?? new Date().toISOString().slice(0, 10)).slice(0, 10);

    if (!studentId) return NextResponse.json({ error: 'Choose a student' }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Transfer date is invalid' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const meta: TransferMeta = {
      direction,
      from: String(body.from ?? '').trim(),
      to: String(body.to ?? '').trim(),
      reason: String(body.reason ?? '').trim(),
      date,
    };

    const { data: existing } = await admin
      .from('student_affairs')
      .select('id')
      .eq('student_id', studentId)
      .maybeSingle();

    if (existing && (existing as { id: string }).id) {
      const update = admin
        .from('student_affairs')
        .update({
          enrollment_status: 'transferred',
          notes: JSON.stringify(meta),
          updated_at: now,
        })
        .eq('id', (existing as { id: string }).id);
      const { error } = await update;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, id: (existing as { id: string }).id });
    }

    const { data, error } = await admin
      .from('student_affairs')
      .insert({
        student_id: studentId,
        enrollment_status: 'transferred',
        admission_date: date,
        notes: JSON.stringify(meta),
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (direction === 'out') {
      await admin.from('students').update({ status: 'transferred', updated_at: now }).eq('id', studentId);
    }

    return NextResponse.json({ ok: true, id: (data as { id: string } | null)?.id ?? null }, { status: 201 });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to record transfer');
  }
}
