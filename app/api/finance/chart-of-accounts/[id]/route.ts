import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { str } from '@/lib/portal-api';

type Ctx = { params: Promise<{ id: string }> };

const TYPES = new Set(['asset', 'liability', 'equity', 'income', 'expense']);
const BALANCES = new Set(['debit', 'credit']);

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;
    const { id } = await params;

    const body = (await request.json()) as Record<string, unknown>;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if ('name' in body) {
      const name = String(body.name ?? '').trim();
      if (!name || name.length > 120) {
        return NextResponse.json({ error: 'Account name is required' }, { status: 400 });
      }
      patch.name = name;
    }
    if ('type' in body) {
      const type = String(body.type ?? '');
      if (!TYPES.has(type)) {
        return NextResponse.json({ error: 'Invalid account type' }, { status: 400 });
      }
      patch.account_type = type;
    }
    if ('normalBalance' in body) {
      const balance = String(body.normalBalance ?? '');
      if (!BALANCES.has(balance)) {
        return NextResponse.json({ error: 'Invalid normal balance' }, { status: 400 });
      }
      patch.normal_balance = balance;
    }
    if ('accountCode' in body) patch.account_code = String(body.accountCode ?? '').trim() || null;
    if ('description' in body) patch.description = str(body.description);
    if ('isActive' in body) patch.is_active = body.isActive !== false;
    if ('parentId' in body) {
      const parentId = str(body.parentId);
      if (parentId === id) {
        return NextResponse.json({ error: 'An account cannot be its own parent' }, { status: 400 });
      }
      patch.parent_account_id = parentId;
    }
    if ('displayOrder' in body) {
      patch.display_order = Number.isFinite(Number(body.displayOrder)) ? Number(body.displayOrder) : 0;
    }

    let query = admin.from('accounts').update(patch).eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query.select('id').maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to update account');
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;
    const { id } = await params;

    let childQuery = admin.from('accounts').select('id', { count: 'exact', head: true }).eq('parent_account_id', id);
    if (tenantId) childQuery = childQuery.eq('tenant_id', tenantId);
    const { count } = await childQuery;
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Reassign or delete child accounts before removing this account.' },
        { status: 400 }
      );
    }

    let query = admin.from('accounts').delete().eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { error } = await query;
    if (error) {
      const blocked = error.code === '23503';
      return NextResponse.json(
        {
          error: blocked
            ? 'This account is used by transactions and cannot be deleted. Mark it inactive instead.'
            : error.message,
        },
        { status: blocked ? 400 : 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to delete account');
  }
}
