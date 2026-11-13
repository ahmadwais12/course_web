import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { str } from '@/lib/portal-api';

type Ctx = { params: Promise<{ id: string }> };

const STATUSES = new Set(['pending', 'processed', 'paid', 'cancelled']);

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;
    const { id } = await params;

    const body = (await request.json()) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};

    if ('status' in body) {
      const status = String(body.status ?? '');
      if (!STATUSES.has(status)) {
        return NextResponse.json({ error: 'Invalid payroll status' }, { status: 400 });
      }
      patch.status = status;
      if (status === 'paid' && !body.paymentDate) {
        patch.payment_date = new Date().toISOString().slice(0, 10);
      }
    }
    if ('paymentDate' in body) patch.payment_date = String(body.paymentDate ?? '') || null;
    if ('paymentMethod' in body) patch.payment_method = str(body.paymentMethod);
    if ('bonus' in body) {
      const bonus = Number(body.bonus);
      if (!Number.isFinite(bonus) || bonus < 0) {
        return NextResponse.json({ error: 'Bonus must be zero or greater' }, { status: 400 });
      }
      patch.bonus = bonus;
    }

    let query = admin.from('salaries').update(patch).eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query.select('id').maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to update payslip');
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;
    const { id } = await params;

    let query = admin.from('salaries').delete().eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to delete payslip');
  }
}
