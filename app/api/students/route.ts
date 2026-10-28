import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('students')
      .select('id, student_code, full_name, email, phone, status, enrollment_date, program_id')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch students';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
