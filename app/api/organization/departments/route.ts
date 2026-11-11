import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { str } from '@/lib/portal-api';

type DepartmentRow = {
  id: string;
  name: string;
  description: string | null;
  head_id: string | null;
  active: boolean | null;
  program_count: number | null;
};

type IdRow = { department_id: string | null };

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const deptQuery = admin
      .from('departments')
      .select('id, name, description, head_id, active, program_count')
      .order('name', { ascending: true });
    const subjectQuery = admin.from('subjects').select('department_id');
    const [{ data: deptData, error }, { data: subjectData }] = await Promise.all([
      tenantId ? deptQuery.eq('tenant_id', tenantId) : deptQuery,
      tenantId ? subjectQuery.eq('tenant_id', tenantId) : subjectQuery,
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const departments = (deptData ?? []) as DepartmentRow[];
    const headIds = departments.map((row) => row.head_id).filter(Boolean) as string[];
    let heads = new Map<string, string>();
    if (headIds.length > 0) {
      const { data: headData } = await admin
        .from('users')
        .select('id, full_name, email')
        .in('id', headIds);
      heads = new Map(
        ((headData ?? []) as { id: string; full_name: string | null; email: string | null }[]).map(
          (row) => [row.id, row.full_name || row.email || '—']
        )
      );
    }

    const subjectCount = new Map<string, number>();
    for (const row of (subjectData ?? []) as IdRow[]) {
      if (row.department_id) {
        subjectCount.set(row.department_id, (subjectCount.get(row.department_id) ?? 0) + 1);
      }
    }

    return NextResponse.json({
      rows: departments.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        headId: row.head_id,
        headName: row.head_id ? heads.get(row.head_id) ?? '—' : null,
        active: row.active !== false,
        programCount: row.program_count ?? 0,
        subjectCount: subjectCount.get(row.id) ?? 0,
      })),
      heads: [...heads.entries()].map(([value, label]) => ({ value, label })),
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load departments');
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? '').trim();
    if (!name || name.length > 120) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('departments')
      .insert({
        tenant_id: tenantId,
        name,
        description: str(body.description),
        head_id: str(body.headId),
        active: body.active !== false,
        program_count: 0,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: (data as { id: string } | null)?.id ?? null }, { status: 201 });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to create department');
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const id = str(body.id);
    if (!id) return NextResponse.json({ error: 'Department id is required' }, { status: 400 });

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
    if (typeof body.description === 'string') patch.description = body.description.trim() || null;
    if (typeof body.active === 'boolean') patch.active = body.active;
    if ('headId' in body) patch.head_id = str(body.headId);

    const update = admin.from('departments').update(patch).eq('id', id);
    const { error } = await (tenantId ? update.eq('tenant_id', tenantId) : update);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to update department');
  }
}
