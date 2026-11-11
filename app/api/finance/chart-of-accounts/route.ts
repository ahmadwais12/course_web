import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num, str } from '@/lib/portal-api';

type AccountRow = {
  id: string;
  account_code: string | null;
  name: string;
  account_type: string;
  normal_balance: string;
  description: string | null;
  is_active: boolean | null;
  parent_account_id: string | null;
  display_order: number | null;
};

const TYPES = new Set(['asset', 'liability', 'equity', 'income', 'expense']);
const BALANCES = new Set(['debit', 'credit']);

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const query = admin
      .from('accounts')
      .select(
        'id, account_code, name, account_type, normal_balance, description, is_active, parent_account_id, display_order'
      )
      .order('display_order')
      .order('account_code');
    const { data, error } = await (tenantId ? query.eq('tenant_id', tenantId) : query);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = ((data ?? []) as AccountRow[]).map((row) => ({
      id: row.id,
      code: str(row.account_code),
      name: row.name,
      type: row.account_type,
      normalBalance: row.normal_balance,
      description: str(row.description),
      isActive: row.is_active !== false,
      parentId: row.parent_account_id,
      displayOrder: num(row.display_order),
    }));

    return NextResponse.json({
      rows,
      summary: {
        accounts: rows.length,
        assets: rows.filter((row) => row.type === 'asset').length,
        liabilities: rows.filter((row) => row.type === 'liability').length,
        income: rows.filter((row) => row.type === 'income').length,
        expenses: rows.filter((row) => row.type === 'expense').length,
      },
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load chart of accounts');
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? '').trim();
    const type = String(body.type ?? '');
    const normalBalance = String(body.normalBalance ?? '');
    const code = String(body.accountCode ?? '').trim();

    if (!name || name.length > 120) {
      return NextResponse.json({ error: 'Account name is required' }, { status: 400 });
    }
    if (!TYPES.has(type)) {
      return NextResponse.json({ error: 'Invalid account type' }, { status: 400 });
    }
    if (!BALANCES.has(normalBalance)) {
      return NextResponse.json({ error: 'Invalid normal balance' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('accounts')
      .insert({
        tenant_id: tenantId,
        account_code: code || null,
        name,
        account_type: type,
        normal_balance: normalBalance,
        description: str(body.description),
        is_system: false,
        is_active: body.isActive !== false,
        parent_account_id: str(body.parentId),
        display_order: Number.isFinite(Number(body.displayOrder)) ? Number(body.displayOrder) : 0,
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
    return dashboardError(error, 'Failed to create account');
  }
}
