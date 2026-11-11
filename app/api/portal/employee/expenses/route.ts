import { NextResponse } from 'next/server';
import { requirePortalUser } from '@/lib/portal-api';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  const auth = await requirePortalUser((role) => role !== 'student');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { admin, user } = auth;

  try {
    const body = (await request.json()) as {
      category?: string;
      subcategory?: string;
      amount?: number | string;
      expenseDate?: string;
      description?: string;
      vendor?: string;
      notes?: string;
    };

    const category = String(body.category ?? '').trim();
    const amount = Number(body.amount);
    const expenseDate = String(body.expenseDate ?? '').trim() || new Date().toISOString().slice(0, 10);

    if (!category) {
      return NextResponse.json({ error: 'Expense category is required' }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }
    if (!DATE_RE.test(expenseDate)) {
      return NextResponse.json({ error: 'A valid expense date is required' }, { status: 400 });
    }

    const { data, error } = await admin
      .from('expenses')
      .insert({
        tenant_id: user.tenantId,
        category,
        subcategory: String(body.subcategory ?? '').trim() || null,
        amount,
        expense_date: expenseDate,
        description: String(body.description ?? '').trim() || null,
        vendor: String(body.vendor ?? '').trim() || null,
        notes: String(body.notes ?? '').trim() || null,
        status: 'pending',
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit expense';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
