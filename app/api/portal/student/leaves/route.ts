import { NextResponse } from 'next/server';
import { portalsForNav } from '@/lib/portals';
import { requirePortalUser, safeRow } from '@/lib/portal-api';

type StudentRow = { id: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  const auth = await requirePortalUser((role) => portalsForNav(role).includes('student'));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { admin, user } = auth;

  const student = await safeRow<StudentRow>(
    admin.from('students').select('id').eq('profile_id', user.id).limit(1).maybeSingle()
  );
  if (!student) {
    return NextResponse.json(
      { error: 'No student record is linked to this account' },
      { status: 404 }
    );
  }

  try {
    const body = (await request.json()) as {
      startDate?: string;
      endDate?: string;
      reason?: string;
    };

    const startDate = String(body.startDate ?? '').trim();
    const endDate = String(body.endDate ?? '').trim() || startDate;
    const reason = String(body.reason ?? '').trim();

    if (!ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) {
      return NextResponse.json({ error: 'Valid start and end dates are required' }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: 'The end date cannot be before the start date' }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: 'A reason is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('student_leaves')
      .insert({
        tenant_id: user.tenantId,
        student_id: student.id,
        start_date: startDate,
        end_date: endDate,
        reason,
        status: 'pending',
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit leave request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
