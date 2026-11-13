import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { str } from '@/lib/portal-api';

type Ctx = { params: Promise<{ id: string }> };

const FREQUENCIES = new Set(['monthly', 'quarterly', 'yearly', 'one_time']);

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
      if (name.length < 2 || name.length > 120) {
        return NextResponse.json({ error: 'Fee structure name is required' }, { status: 400 });
      }
      patch.name = name;
    }
    if ('amount' in body) {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
      }
      patch.amount = amount;
      patch.total_amount = amount;
    }
    if ('frequency' in body) {
      const frequency = String(body.frequency ?? '');
      if (!FREQUENCIES.has(frequency)) {
        return NextResponse.json({ error: 'Invalid billing frequency' }, { status: 400 });
      }
      patch.frequency = frequency;
    }
    if ('dueDay' in body) {
      const dueDay = body.dueDay === '' || body.dueDay == null ? null : Number(body.dueDay);
      if (dueDay !== null && (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)) {
        return NextResponse.json({ error: 'Due day must be between 1 and 31' }, { status: 400 });
      }
      patch.due_day = dueDay;
    }
    if ('currency' in body) {
      patch.currency = String(body.currency ?? 'AFN').trim().toUpperCase() || 'AFN';
    }
    if ('feeTypeId' in body) patch.fee_type_id = str(body.feeTypeId);
    if ('programId' in body) patch.program_id = str(body.programId);
    if ('classId' in body) patch.class_id = str(body.classId);
    if ('academicYearId' in body) patch.academic_year_id = str(body.academicYearId);
    if ('effectiveFrom' in body) patch.effective_from = str(body.effectiveFrom);
    if ('effectiveUntil' in body) patch.effective_until = str(body.effectiveUntil);
    if ('description' in body) patch.description = str(body.description);
    if ('isActive' in body) patch.is_active = body.isActive !== false;

    let query = admin.from('fee_structures').update(patch).eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query.select('id').maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Fee structure not found' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to update fee structure');
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;
    const { id } = await params;

    let query = admin.from('fee_structures').delete().eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { error } = await query;
    if (error) {
      const blocked = error.code === '23503';
      return NextResponse.json(
        {
          error: blocked
            ? 'This fee plan is linked to invoices and cannot be deleted. Mark it inactive instead.'
            : error.message,
        },
        { status: blocked ? 400 : 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to delete fee structure');
  }
}
