import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';

type Ctx = { params: Promise<{ id: string }> };

const CONTRACT_TYPES = new Set(['full-time', 'part-time', 'contract', 'temporary']);
const STATUSES = new Set(['active', 'on_leave', 'inactive', 'resigned', 'terminated']);

/** DB check accepts full-time/part-time/contract/temporary; map older UI values onto it. */
function normalizeContractType(value: unknown) {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll(' ', '-')
    .replaceAll('_', '-');
  if (raw === 'permanent' || raw === 'fulltime') return 'full-time';
  if (raw === 'parttime') return 'part-time';
  if (raw === 'probation') return 'temporary';
  return raw;
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;
    const { id } = await params;

    const kind = new URL(request.url).searchParams.get('kind') === 'teacher' ? 'teachers' : 'staff';
    const body = (await request.json()) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};

    if ('contractType' in body) {
      const contractType = normalizeContractType(body.contractType);
      if (!CONTRACT_TYPES.has(contractType)) {
        return NextResponse.json(
          { error: 'Contract type must be full-time, part-time, contract, or temporary' },
          { status: 400 }
        );
      }
      patch.contract_type = contractType;
    }
    if ('contractEndDate' in body) patch.contract_end_date = String(body.contractEndDate ?? '') || null;
    if ('joinDate' in body) patch.join_date = String(body.joinDate ?? '') || null;
    if ('salary' in body) {
      const salary = Number(body.salary);
      if (!Number.isFinite(salary) || salary < 0) {
        return NextResponse.json({ error: 'Salary must be zero or greater' }, { status: 400 });
      }
      patch.salary = salary;
    }
    if ('status' in body) {
      const status = String(body.status ?? '').toLowerCase();
      if (!STATUSES.has(status)) {
        return NextResponse.json({ error: 'Invalid employment status' }, { status: 400 });
      }
      patch.status = status;
    }

    let query = admin.from(kind).update(patch).eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query.select('id').maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to update contract');
  }
}
