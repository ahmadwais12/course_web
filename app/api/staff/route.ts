import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('staff')
      .select('id, employee_code, full_name, email, role, designation, salary, status, join_date')
      .order('join_date', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Shape expected by StaffDashboard UI
    const staff = (data ?? []).map((row) => ({
      id: row.id,
      name: row.full_name,
      role: row.role || row.designation || 'Staff',
      salary: Number(row.salary ?? 0),
      status: row.status === 'active' ? 'Active' : row.status,
      email: row.email,
      employee_code: row.employee_code,
    }));

    return NextResponse.json(staff);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch staff';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
