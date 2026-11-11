import { NextResponse } from 'next/server';
import { requirePortalUser, safeRow } from '@/lib/portal-api';

type AttendanceRow = {
  id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string | null;
};

export async function POST(request: Request) {
  const auth = await requirePortalUser((role) => role !== 'student');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { admin, user } = auth;

  try {
    const body = (await request.json()) as { action?: string };
    const action = body.action === 'check_out' ? 'check_out' : 'check_in';

    const [staff, teacher] = await Promise.all([
      safeRow<{ id: string }>(
        admin.from('staff').select('id').eq('profile_id', user.id).limit(1).maybeSingle()
      ),
      safeRow<{ id: string }>(
        admin.from('teachers').select('id').eq('profile_id', user.id).limit(1).maybeSingle()
      ),
    ]);

    const preferTeacher = user.role === 'teacher' && Boolean(teacher);
    const recordId = preferTeacher ? teacher?.id : staff?.id ?? teacher?.id;
    const personType = preferTeacher ? 'teacher' : staff ? 'staff' : 'teacher';

    if (!recordId) {
      return NextResponse.json(
        { error: 'No employee record is linked to this account' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const time = now.toTimeString().slice(0, 8);

    const existing = await safeRow<AttendanceRow>(
      admin
        .from('attendance')
        .select('id, check_in_time, check_out_time, status')
        .eq('person_type', personType)
        .eq('person_id', recordId)
        .eq('date', today)
        .limit(1)
        .maybeSingle()
    );

    if (action === 'check_in') {
      if (existing?.check_in_time) {
        return NextResponse.json(
          { error: `You already checked in at ${existing.check_in_time}` },
          { status: 409 }
        );
      }

      if (existing) {
        const { error } = await admin
          .from('attendance')
          .update({
            check_in_time: time,
            status: existing.status || 'present',
            updated_at: now.toISOString(),
          })
          .eq('id', existing.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      } else {
        const { error } = await admin.from('attendance').insert({
          tenant_id: user.tenantId,
          person_id: recordId,
          person_type: personType,
          date: today,
          status: 'present',
          check_in_time: time,
          marked_by: user.id,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, action, checkInTime: time, checkOutTime: existing?.check_out_time ?? null });
    }

    if (!existing?.check_in_time) {
      return NextResponse.json({ error: 'Check in before checking out' }, { status: 400 });
    }
    if (existing.check_out_time) {
      return NextResponse.json(
        { error: `You already checked out at ${existing.check_out_time}` },
        { status: 409 }
      );
    }

    const { error } = await admin
      .from('attendance')
      .update({ check_out_time: time, updated_at: now.toISOString() })
      .eq('id', existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, action, checkInTime: existing.check_in_time, checkOutTime: time });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to record attendance';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
