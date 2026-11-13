import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { str } from '@/lib/portal-api';

type Ctx = { params: Promise<{ id: string }> };

const STATUSES = new Set(['pending', 'approved', 'rejected', 'paid']);

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;
    const { id } = await params;

    const body = (await request.json()) as Record<string, unknown>;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if ('category' in body) {
      const category = String(body.category ?? '').trim();
      if (!category || category.length > 80) {
        return NextResponse.json({ error: 'Expense category is required' }, { status: 400 });
      }
      patch.category = category;
    }
    if ('amount' in body) {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
      }
      patch.amount = amount;
    }
    if ('status' in body) {
      const status = String(body.status ?? '');
      if (!STATUSES.has(status)) {
        return NextResponse.json({ error: 'Invalid expense status' }, { status: 400 });
      }
      patch.status = status;
    }
    if ('expenseDate' in body) {
      patch.expense_date = String(body.expenseDate ?? '') || null;
    }
    if ('subcategory' in body) patch.subcategory = str(body.subcategory);
    if ('description' in body) patch.description = str(body.description);
    if ('vendor' in body) patch.vendor = str(body.vendor);
    if ('invoiceNumber' in body) patch.invoice_number = str(body.invoiceNumber);
    if ('paymentMethod' in body) patch.payment_method = str(body.paymentMethod);
    if ('notes' in body) patch.notes = str(body.notes);

    let query = admin.from('expenses').update(patch).eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query.select('id').maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to update expense');
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;
    const { id } = await params;

    let query = admin.from('expenses').delete().eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to delete expense');
  }
}
