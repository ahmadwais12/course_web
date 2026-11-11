import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { str } from '@/lib/portal-api';

type SemesterRow = {
  id: string;
  academic_year_id: string | null;
  name: string;
  code: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
};

function cleanDate(value: unknown) {
  const text = String(value ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const semesterQuery = admin
      .from('semesters')
      .select('id, academic_year_id, name, code, start_date, end_date, is_active')
      .order('start_date', { ascending: false });
    const yearQuery = admin.from('academic_years').select('id, name').order('start_date', {
      ascending: false,
    });
    const [{ data: semesterData, error }, { data: yearData }] = await Promise.all([
      tenantId ? semesterQuery.eq('tenant_id', tenantId) : semesterQuery,
      tenantId ? yearQuery.eq('tenant_id', tenantId) : yearQuery,
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const yearNames = new Map(
      ((yearData ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name])
    );

    return NextResponse.json({
      rows: ((semesterData ?? []) as SemesterRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        academicYearId: row.academic_year_id,
        academicYear: row.academic_year_id ? yearNames.get(row.academic_year_id) ?? '—' : '—',
        startDate: row.start_date,
        endDate: row.end_date,
        isActive: row.is_active !== false,
      })),
      academicYears: ((yearData ?? []) as { id: string; name: string }[]).map((row) => ({
        value: row.id,
        label: row.name,
      })),
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load terms');
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? '').trim();
    const code = String(body.code ?? '').trim();
    const academicYearId = str(body.academicYearId);
    const startDate = cleanDate(body.startDate);
    const endDate = cleanDate(body.endDate);

    if (!name) return NextResponse.json({ error: 'Term name is required' }, { status: 400 });
    if (!code) return NextResponse.json({ error: 'Term code is required' }, { status: 400 });
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: 'End date must be after the start date' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('semesters')
      .insert({
        tenant_id: tenantId,
        academic_year_id: academicYearId,
        name,
        code,
        start_date: startDate,
        end_date: endDate,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: (data as { id: string } | null)?.id ?? null }, { status: 201 });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to create term');
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const id = str(body.id);
    if (!id) return NextResponse.json({ error: 'Term id is required' }, { status: 400 });

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.isActive === 'boolean') patch.is_active = body.isActive;
    if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
    if (typeof body.code === 'string' && body.code.trim()) patch.code = body.code.trim();
    const academicYearId = str(body.academicYearId);
    if (academicYearId) patch.academic_year_id = academicYearId;
    const startDate = cleanDate(body.startDate);
    const endDate = cleanDate(body.endDate);
    if (startDate) patch.start_date = startDate;
    if (endDate) patch.end_date = endDate;

    const update = admin.from('semesters').update(patch).eq('id', id);
    const { error } = await (tenantId ? update.eq('tenant_id', tenantId) : update);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to update term');
  }
}
