import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num, str } from '@/lib/portal-api';

type SubjectRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  department_id: string | null;
  credits: number | null;
  is_active: boolean | null;
};

type IdRow = { subject_id: string | null };

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const subjectQuery = admin
      .from('subjects')
      .select('id, name, code, description, department_id, credits, is_active')
      .order('name', { ascending: true });
    const deptQuery = admin.from('departments').select('id, name').order('name');
    const linkQuery = admin.from('class_subjects').select('subject_id');
    const [{ data: subjectData, error }, { data: deptData }, { data: linkData }] = await Promise.all([
      tenantId ? subjectQuery.eq('tenant_id', tenantId) : subjectQuery,
      tenantId ? deptQuery.eq('tenant_id', tenantId) : deptQuery,
      tenantId ? linkQuery.eq('tenant_id', tenantId) : linkQuery,
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const deptNames = new Map(
      ((deptData ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name])
    );
    const usage = new Map<string, number>();
    for (const row of (linkData ?? []) as IdRow[]) {
      if (row.subject_id) usage.set(row.subject_id, (usage.get(row.subject_id) ?? 0) + 1);
    }

    return NextResponse.json({
      rows: ((subjectData ?? []) as SubjectRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        description: row.description,
        departmentId: row.department_id,
        department: row.department_id ? deptNames.get(row.department_id) ?? '—' : '—',
        credits: num(row.credits),
        classLinks: usage.get(row.id) ?? 0,
        isActive: row.is_active !== false,
      })),
      departments: [...deptNames.entries()].map(([value, label]) => ({ value, label })),
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load subjects');
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
    const credits = Number(body.credits ?? 0);

    if (!name) return NextResponse.json({ error: 'Subject name is required' }, { status: 400 });
    if (!code) return NextResponse.json({ error: 'Subject code is required' }, { status: 400 });
    if (!Number.isFinite(credits) || credits < 0) {
      return NextResponse.json({ error: 'Credits must be zero or more' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('subjects')
      .insert({
        tenant_id: tenantId,
        name,
        code,
        description: str(body.description),
        department_id: str(body.departmentId),
        credits,
        is_active: body.isActive !== false,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: (data as { id: string } | null)?.id ?? null }, { status: 201 });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to create subject');
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const id = str(body.id);
    if (!id) return NextResponse.json({ error: 'Subject id is required' }, { status: 400 });

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
    if (typeof body.code === 'string' && body.code.trim()) patch.code = body.code.trim();
    if (typeof body.description === 'string') patch.description = body.description.trim() || null;
    if ('departmentId' in body) patch.department_id = str(body.departmentId);
    if (body.credits !== undefined) {
      const credits = Number(body.credits);
      if (!Number.isFinite(credits) || credits < 0) {
        return NextResponse.json({ error: 'Credits must be zero or more' }, { status: 400 });
      }
      patch.credits = credits;
    }
    if (typeof body.isActive === 'boolean') patch.is_active = body.isActive;

    const update = admin.from('subjects').update(patch).eq('id', id);
    const { error } = await (tenantId ? update.eq('tenant_id', tenantId) : update);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to update subject');
  }
}
