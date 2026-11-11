import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num, str } from '@/lib/portal-api';

type AcademicYearRow = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean | null;
  is_active: boolean | null;
};

type CountRow = { academic_year_id: string | null };

function cleanDate(value: unknown) {
  const text = String(value ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const query = admin
      .from('academic_years')
      .select('id, name, start_date, end_date, is_current, is_active')
      .order('start_date', { ascending: false });
    const { data, error } = await (tenantId ? query.eq('tenant_id', tenantId) : query);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const years = (data ?? []) as AcademicYearRow[];

    const semestersQuery = admin.from('semesters').select('academic_year_id');
    const enrollmentsQuery = admin.from('student_enrollments').select('academic_year_id');
    const [{ data: semesterRows }, { data: enrollmentRows }] = await Promise.all([
      tenantId ? semestersQuery.eq('tenant_id', tenantId) : semestersQuery,
      tenantId ? enrollmentsQuery.eq('tenant_id', tenantId) : enrollmentsQuery,
    ]);

    const semesterCount = new Map<string, number>();
    for (const row of (semesterRows ?? []) as CountRow[]) {
      if (row.academic_year_id) {
        semesterCount.set(row.academic_year_id, (semesterCount.get(row.academic_year_id) ?? 0) + 1);
      }
    }
    const enrollmentCount = new Map<string, number>();
    for (const row of (enrollmentRows ?? []) as CountRow[]) {
      if (row.academic_year_id) {
        enrollmentCount.set(
          row.academic_year_id,
          (enrollmentCount.get(row.academic_year_id) ?? 0) + 1
        );
      }
    }

    return NextResponse.json({
      rows: years.map((row) => ({
        id: row.id,
        name: row.name,
        startDate: row.start_date,
        endDate: row.end_date,
        isCurrent: Boolean(row.is_current),
        isActive: row.is_active !== false,
        semesters: semesterCount.get(row.id) ?? 0,
        enrollments: enrollmentCount.get(row.id) ?? 0,
      })),
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load academic years');
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? '').trim();
    const startDate = cleanDate(body.startDate);
    const endDate = cleanDate(body.endDate);

    if (!name || name.length > 80) {
      return NextResponse.json({ error: 'Academic year name is required' }, { status: 400 });
    }
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: 'End date must be after the start date' }, { status: 400 });
    }
    if (body.isCurrent === true) {
      const reset = admin.from('academic_years').update({ is_current: false });
      await (tenantId ? reset.eq('tenant_id', tenantId) : reset.neq('id', ''));
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('academic_years')
      .insert({
        tenant_id: tenantId,
        name,
        start_date: startDate,
        end_date: endDate,
        is_current: body.isCurrent === true,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: (data as { id: string } | null)?.id ?? null }, { status: 201 });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to create academic year');
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const id = str(body.id);
    if (!id) return NextResponse.json({ error: 'Academic year id is required' }, { status: 400 });

    if (body.isCurrent === true) {
      const reset = admin.from('academic_years').update({ is_current: false });
      await (tenantId ? reset.eq('tenant_id', tenantId) : reset.neq('id', ''));
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.isCurrent === true) patch.is_current = true;
    if (typeof body.isActive === 'boolean') patch.is_active = body.isActive;
    if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
    const startDate = cleanDate(body.startDate);
    const endDate = cleanDate(body.endDate);
    if (startDate) patch.start_date = startDate;
    if (endDate) patch.end_date = endDate;

    const update = admin.from('academic_years').update(patch).eq('id', id);
    const { error } = await (tenantId ? update.eq('tenant_id', tenantId) : update);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to update academic year');
  }
}
