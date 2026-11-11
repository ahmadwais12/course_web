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

type FlowRow = { amount: number | null; payment_method: string | null };

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const [accountsRes, paymentsRes, expensesRes] = await Promise.all([
      (() => {
        const query = admin
          .from('accounts')
          .select(
            'id, account_code, name, account_type, normal_balance, description, is_active, parent_account_id, display_order'
          )
          .order('display_order')
          .order('account_code');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin.from('payments').select('amount, payment_method');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      (() => {
        const query = admin.from('expenses').select('amount, payment_method');
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
    ]);

    const accounts = ((accountsRes.data ?? []) as AccountRow[]).map((row) => ({
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

    const isCash = (method: string | null) => (method ?? '').toLowerCase() === 'cash';
    const payments = (paymentsRes.data ?? []) as FlowRow[];
    const expenses = (expensesRes.data ?? []) as FlowRow[];

    const cashIn = payments.filter((row) => isCash(row.payment_method)).reduce((sum, row) => sum + num(row.amount), 0);
    const bankIn = payments.filter((row) => !isCash(row.payment_method)).reduce((sum, row) => sum + num(row.amount), 0);
    const cashOut = expenses.filter((row) => isCash(row.payment_method)).reduce((sum, row) => sum + num(row.amount), 0);
    const bankOut = expenses.filter((row) => !isCash(row.payment_method)).reduce((sum, row) => sum + num(row.amount), 0);

    return NextResponse.json({
      rows: accounts,
      summary: {
        accounts: accounts.length,
        active: accounts.filter((row) => row.isActive).length,
        assets: accounts.filter((row) => row.type === 'asset').length,
        cashBalance: cashIn - cashOut,
        bankBalance: bankIn - bankOut,
        totalExpenses: cashOut + bankOut,
        netPosition: cashIn + bankIn - cashOut - bankOut,
      },
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load accounts');
  }
}
