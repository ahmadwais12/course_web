import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type AttendanceRow = {
  id: string;
  staff_id: string | null;
  date: string | null;
  check_in: string | null;
  check_out: string | null;
  status: string | null;
  late_minutes: number | null;
};

type StaffRow = {
  id: string;
  full_name: string | null;
  employee_code: string | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('staff_attendance')
      .select('id, staff_id, date, check_in, check_out, status, late_minutes')
      .order('date', { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as AttendanceRow[];
    const ids = [
      ...new Set(rows.map((r) => r.staff_id).filter((id): id is string => Boolean(id))),
    ];
    const names = new Map<string, StaffRow>();

    if (ids.length) {
      const { data: staff } = await supabase
        .from('staff')
        .select('id, full_name, employee_code')
        .in('id', ids);
      for (const s of (staff ?? []) as StaffRow[]) {
        names.set(s.id, s);
      }
    }

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        staff_id: r.staff_id,
        employee_name: (r.staff_id && names.get(r.staff_id)?.full_name) || '—',
        employee_code: (r.staff_id && names.get(r.staff_id)?.employee_code) || null,
        date: r.date,
        check_in: r.check_in,
        check_out: r.check_out,
        late_minutes: Number(r.late_minutes ?? 0),
        status: r.status ?? 'present',
      }))
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch staff attendance';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
