import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type ClassRow = {
  id: string;
  name: string | null;
  grade: string | null;
  year: string | number | null;
  teacher_id: string | null;
  student_count: number | null;
  active: boolean | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, grade, year, teacher_id, student_count, active')
      .order('name', { ascending: true })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as ClassRow[];

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        grade: row.grade,
        year: row.year,
        student_count: Number(row.student_count ?? 0),
        status: row.active === false ? 'inactive' : 'active',
      }))
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch classes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
