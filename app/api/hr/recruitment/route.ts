import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num, str } from '@/lib/portal-api';
import { normalizeOpeningStatus, openingValues } from '@/lib/hr-recruitment';

type OpeningRow = {
  id: string;
  position_title: string | null;
  department: string | null;
  job_type: string | null;
  openings: number | null;
  applications_count: number | null;
  deadline_date: string | null;
  posted_date: string | null;
  status: string | null;
  description: string | null;
  requirements: string[] | null;
  experience_required: number | null;
  salary_range_min: number | null;
  salary_range_max: number | null;
};

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin } = auth.session;

    const { data, error } = await admin
      .from('recruitment')
      .select(
        'id, position_title, department, job_type, openings, applications_count, deadline_date, posted_date, status, description, requirements, experience_required, salary_range_min, salary_range_max'
      )
      .order('posted_date', { ascending: false })
      .limit(500);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = ((data ?? []) as OpeningRow[]).map((row) => ({
      id: row.id,
      position_title: str(row.position_title) ?? 'Untitled position',
      department: str(row.department),
      job_type: str(row.job_type) ?? 'Full-time',
      openings: num(row.openings),
      applications_count: num(row.applications_count),
      deadline_date: row.deadline_date,
      posted_date: row.posted_date,
      status: str(row.status) ?? 'Open',
      description: str(row.description),
      requirements: Array.isArray(row.requirements) ? row.requirements : [],
      experience_required: num(row.experience_required),
      salary_range_min: row.salary_range_min === null ? null : num(row.salary_range_min),
      salary_range_max: row.salary_range_max === null ? null : num(row.salary_range_max),
    }));

    return NextResponse.json({
      rows,
      summary: {
        total: rows.length,
        open: rows.filter((row) => row.status === 'Open').length,
        openings: rows
          .filter((row) => row.status === 'Open')
          .reduce((sum, row) => sum + row.openings, 0),
        applications: rows.reduce((sum, row) => sum + row.applications_count, 0),
      },
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load recruitment openings');
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, userId } = auth.session;

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

    const result = openingValues(body, true);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });

    const values: Record<string, unknown> = { ...result.values, status: 'Open' };
    if (typeof body.status === 'string' && body.status) {
      const status = normalizeOpeningStatus(body.status);
      if (!status) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      values.status = status;
    }
    if (!values.job_type) values.job_type = 'Full-time';
    if (!values.openings) values.openings = 1;
    if (!values.posted_date) values.posted_date = new Date().toISOString().slice(0, 10);
    values.created_by = userId;

    const { data, error } = await admin
      .from('recruitment')
      .insert(values)
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, id: (data as { id: string }).id }, { status: 201 });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to create opening');
  }
}
