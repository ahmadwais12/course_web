import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num, str } from '@/lib/portal-api';

const PERSON_TYPES = ['staff', 'teacher'] as const;
const ATTENDANCE_STATUSES = new Set(['present', 'absent', 'late', 'excused', 'half_day']);

type PersonType = (typeof PERSON_TYPES)[number];

type AttendanceRow = {
  id: string;
  person_id: string | null;
  person_type: string | null;
  date: string | null;
  status: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  late_minutes: number | null;
  remarks: string | null;
};

type PersonRow = {
  id: string;
  full_name: string | null;
  employee_code: string | null;
  status: string | null;
};

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function isTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const params = new URL(request.url).searchParams;
    const from = params.get('from');
    const to = params.get('to');

    let attendanceQuery = admin
      .from('attendance')
      .select(
        'id, person_id, person_type, date, status, check_in_time, check_out_time, late_minutes, remarks'
      )
      .in('person_type', PERSON_TYPES)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(2000);
    if (tenantId) attendanceQuery = attendanceQuery.eq('tenant_id', tenantId);
    if (from && isIsoDate(from)) attendanceQuery = attendanceQuery.gte('date', from);
    if (to && isIsoDate(to)) attendanceQuery = attendanceQuery.lte('date', to);

    const staffQuery = admin
      .from('staff')
      .select('id, full_name, employee_code, status')
      .order('full_name');
    const teacherQuery = admin
      .from('teachers')
      .select('id, full_name, employee_code, status')
      .order('full_name');

    const [attendanceRes, staffRes, teacherRes] = await Promise.all([
      attendanceQuery,
      tenantId ? staffQuery.eq('tenant_id', tenantId) : staffQuery,
      tenantId ? teacherQuery.eq('tenant_id', tenantId) : teacherQuery,
    ]);

    if (attendanceRes.error) {
      return NextResponse.json({ error: attendanceRes.error.message }, { status: 500 });
    }
    if (staffRes.error) return NextResponse.json({ error: staffRes.error.message }, { status: 500 });
    if (teacherRes.error) {
      return NextResponse.json({ error: teacherRes.error.message }, { status: 500 });
    }

    const people = new Map<
      string,
      { id: string; kind: PersonType; name: string; code: string | null; status: string }
    >();

    for (const row of (staffRes.data ?? []) as PersonRow[]) {
      people.set(`staff:${row.id}`, {
        id: row.id,
        kind: 'staff',
        name: str(row.full_name) ?? 'Unnamed employee',
        code: str(row.employee_code),
        status: str(row.status) ?? 'active',
      });
    }
    for (const row of (teacherRes.data ?? []) as PersonRow[]) {
      people.set(`teacher:${row.id}`, {
        id: row.id,
        kind: 'teacher',
        name: str(row.full_name) ?? 'Unnamed teacher',
        code: str(row.employee_code),
        status: str(row.status) ?? 'active',
      });
    }

    const rows = ((attendanceRes.data ?? []) as AttendanceRow[]).map((row) => {
      const kind: PersonType = row.person_type === 'teacher' ? 'teacher' : 'staff';
      const person = row.person_id ? people.get(`${kind}:${row.person_id}`) : undefined;
      return {
        id: row.id,
        personId: row.person_id,
        personType: kind,
        employeeName: person?.name ?? '—',
        employeeCode: person?.code ?? null,
        date: row.date,
        checkIn: row.check_in_time,
        checkOut: row.check_out_time,
        lateMinutes: num(row.late_minutes),
        status: str(row.status) ?? 'present',
        remarks: str(row.remarks),
      };
    });

    const today = todayIso();
    const todays = rows.filter((row) => row.date === today);

    return NextResponse.json({
      rows,
      summary: {
        todayPresent: todays.filter((row) =>
          ['present', 'late', 'half_day'].includes(row.status)
        ).length,
        todayLate: todays.filter((row) => row.status === 'late').length,
        todayAbsent: todays.filter((row) => row.status === 'absent').length,
        todayMarked: todays.length,
      },
      employees: [...people.values()].sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load staff attendance');
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, userId, tenantId } = auth.session;

    const body = (await request.json().catch(() => null)) as
      | {
          personType?: string;
          personId?: string;
          date?: string;
          status?: string;
          checkIn?: string | null;
          checkOut?: string | null;
          lateMinutes?: number | string;
          remarks?: string | null;
        }
      | null;

    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const personType = body.personType === 'teacher' ? 'teacher' : body.personType === 'staff' ? 'staff' : null;
    const personId = str(body.personId);
    const date = str(body.date);
    const status = str(body.status) ?? 'present';

    if (!personType) {
      return NextResponse.json({ error: 'Choose an employee type' }, { status: 400 });
    }
    if (!personId) {
      return NextResponse.json({ error: 'Choose an employee' }, { status: 400 });
    }
    if (!date || !isIsoDate(date)) {
      return NextResponse.json({ error: 'Enter a valid attendance date' }, { status: 400 });
    }
    if (!ATTENDANCE_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Choose a valid attendance status' }, { status: 400 });
    }

    const checkIn = str(body.checkIn);
    const checkOut = str(body.checkOut);
    if (checkIn && !isTime(checkIn)) {
      return NextResponse.json({ error: 'Check-in must be a time like 08:30' }, { status: 400 });
    }
    if (checkOut && !isTime(checkOut)) {
      return NextResponse.json({ error: 'Check-out must be a time like 16:00' }, { status: 400 });
    }

    const lateMinutes = Math.max(0, Math.trunc(num(body.lateMinutes)));
    const remarks = str(body.remarks);

    const patch = {
      person_type: personType,
      date,
      status,
      check_in_time: checkIn,
      check_out_time: checkOut,
      late_minutes: status === 'late' ? lateMinutes : 0,
      remarks,
    };

    let existingQuery = admin
      .from('attendance')
      .select('id')
      .eq('person_id', personId)
      .eq('person_type', personType)
      .eq('date', date);
    if (tenantId) existingQuery = existingQuery.eq('tenant_id', tenantId);
    const { data: existing, error: existingError } = await existingQuery
      .limit(1)
      .maybeSingle();
    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existing) {
      let updateQuery = admin
        .from('attendance')
        .update(patch)
        .eq('id', (existing as { id: string }).id);
      if (tenantId) updateQuery = updateQuery.eq('tenant_id', tenantId);
      const { error } = await updateQuery;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, id: (existing as { id: string }).id, updated: true });
    }

    const { data: created, error } = await admin
      .from('attendance')
      .insert({
        ...patch,
        person_id: personId,
        tenant_id: tenantId,
        marked_by: userId,
      })
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: (created as { id: string }).id, updated: false });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to save attendance');
  }
}
