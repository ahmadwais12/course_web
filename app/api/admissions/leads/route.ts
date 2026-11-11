import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { str } from '@/lib/portal-api';

type LeadRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  interested_program: string | null;
  status: string | null;
  source: string | null;
  notes: string | null;
  follow_up_date: string | null;
  assigned_to: string | null;
  created_at: string | null;
};

const STATUSES = new Set(['New', 'Contacted', 'Visited', 'Admitted', 'Lost']);

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const query = admin
      .from('leads')
      .select(
        'id, name, email, phone, interested_program, status, source, notes, follow_up_date, assigned_to, created_at'
      )
      .order('created_at', { ascending: false });
    const { data, error } = await (tenantId ? query.eq('tenant_id', tenantId) : query);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const leads = (data ?? []) as LeadRow[];
    const assigneeIds = [...new Set(leads.map((row) => row.assigned_to).filter(Boolean))] as string[];
    let assignees = new Map<string, string>();
    if (assigneeIds.length > 0) {
      const { data: userData } = await admin
        .from('users')
        .select('id, full_name, email')
        .in('id', assigneeIds);
      assignees = new Map(
        ((userData ?? []) as { id: string; full_name: string | null; email: string | null }[]).map(
          (row) => [row.id, row.full_name || row.email || '—']
        )
      );
    }

    return NextResponse.json({
      rows: leads.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        program: row.interested_program,
        status: row.status ?? 'New',
        source: row.source,
        notes: row.notes,
        followUpDate: row.follow_up_date,
        assignedTo: row.assigned_to,
        assignedName: row.assigned_to ? assignees.get(row.assigned_to) ?? '—' : null,
        createdAt: row.created_at,
      })),
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load admission leads');
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? '').trim();
    const status = String(body.status ?? 'New');
    if (!name) return NextResponse.json({ error: 'Applicant name is required' }, { status: 400 });
    if (!STATUSES.has(status)) return NextResponse.json({ error: 'Invalid lead status' }, { status: 400 });

    const followUp = String(body.followUpDate ?? '').slice(0, 10);
    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('leads')
      .insert({
        tenant_id: tenantId,
        name,
        email: str(body.email),
        phone: str(body.phone),
        interested_program: str(body.program),
        status,
        source: str(body.source) ?? 'Walk-in',
        notes: str(body.notes),
        follow_up_date: /^\d{4}-\d{2}-\d{2}$/.test(followUp) ? followUp : null,
        assigned_to: str(body.assignedTo),
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: (data as { id: string } | null)?.id ?? null }, { status: 201 });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to create admission lead');
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const id = str(body.id);
    if (!id) return NextResponse.json({ error: 'Lead id is required' }, { status: 400 });

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const status = str(body.status);
    if (status) {
      if (!STATUSES.has(status)) return NextResponse.json({ error: 'Invalid lead status' }, { status: 400 });
      patch.status = status;
    }
    if (typeof body.notes === 'string') patch.notes = body.notes.trim() || null;
    if (typeof body.assignedTo === 'string') patch.assigned_to = body.assignedTo || null;
    const followUp = String(body.followUpDate ?? '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(followUp)) patch.follow_up_date = followUp;

    const update = admin.from('leads').update(patch).eq('id', id);
    const { error } = await (tenantId ? update.eq('tenant_id', tenantId) : update);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to update admission lead');
  }
}
