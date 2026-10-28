import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type OpeningRow = {
  id: string;
  position_title: string | null;
  department: string | null;
  job_type: string | null;
  openings: number | null;
  applications_count: number | null;
  deadline_date: string | null;
  status: string | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('recruitment')
      .select(
        'id, position_title, department, job_type, openings, applications_count, deadline_date, posted_date, status'
      )
      .order('posted_date', { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as OpeningRow[];

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        position_title: row.position_title,
        department: row.department,
        job_type: row.job_type,
        openings: Number(row.openings ?? 0),
        applications_count: Number(row.applications_count ?? 0),
        deadline_date: row.deadline_date,
        status: row.status ?? 'open',
      }))
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch recruitment openings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
