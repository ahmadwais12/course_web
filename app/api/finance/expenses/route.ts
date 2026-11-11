import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num, str } from '@/lib/portal-api';

type ExpenseRow = {
  id: string;
  category: string;
  subcategory: string | null;
  amount: number | null;
  expense_date: string | null;
  description: string | null;
  vendor: string | null;
  invoice_number: string | null;
  status: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string | null;
};

const STATUSES = new Set(['pending', 'approved', 'rejected', 'paid']);

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const query = admin
      .from('expenses')
      .select(
        'id, category, subcategory, amount, expense_date, description, vendor, invoice_number, status, payment_method, notes, created_at'
      )
      .order('expense_date', { ascending: false });
    const { data, error } = await (tenantId ? query.eq('tenant_id', tenantId) : query);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = ((data ?? []) as ExpenseRow[]).map((row) => ({
      id: row.id,
      category: row.category,
      subcategory: str(row.subcategory),
      amount: num(row.amount),
      expenseDate: row.expense_date,
      description: str(row.description),
      vendor: str(row.vendor),
      invoiceNumber: str(row.invoice_number),
      status: str(row.status) ?? 'pending',
      paymentMethod: str(row.payment_method),
      notes: str(row.notes),
      createdAt: row.created_at,
    }));

    const categories = [...new Set(rows.map((row) => row.category).filter(Boolean))].sort();

    return NextResponse.json({
      rows,
      categories,
      summary: {
        total: rows.reduce((sum, row) => sum + row.amount, 0),
        pending: rows.filter((row) => row.status === 'pending').length,
        approved: rows.filter((row) => row.status === 'approved').length,
      },
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load expenses');
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId, userId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const category = String(body.category ?? '').trim();
    const amount = Number(body.amount);
    const status = String(body.status ?? 'pending');
    const expenseDate = String(body.expenseDate ?? new Date().toISOString().slice(0, 10));

    if (!category || category.length > 80) {
      return NextResponse.json({ error: 'Expense category is required' }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }
    if (!STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid expense status' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('expenses')
      .insert({
        tenant_id: tenantId,
        category,
        subcategory: str(body.subcategory),
        amount,
        expense_date: expenseDate,
        description: str(body.description),
        vendor: str(body.vendor),
        vendor_contact: str(body.vendorContact),
        invoice_number: str(body.invoiceNumber),
        status,
        payment_method: str(body.paymentMethod),
        notes: str(body.notes),
        created_by: userId,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: (data as { id: string } | null)?.id ?? null }, { status: 201 });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to create expense');
  }
}
