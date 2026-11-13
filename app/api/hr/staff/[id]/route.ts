import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { buildEmployeeValues, employeeKind, friendlyEmployeeError } from '@/lib/hr-employee';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;
    const { id } = await params;

    const kind = employeeKind(new URL(request.url).searchParams.get('kind'));
    if (!kind) {
      return NextResponse.json({ error: 'Choose employee type: staff or teacher' }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

    const result = buildEmployeeValues(body, kind, false);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    const values = { ...result.values };
    if ('employee_code' in values && !values.employee_code) delete values.employee_code;
    if (Object.keys(values).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    let query = admin.from(kind).update(values).eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query.select('id').maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: friendlyEmployeeError(error.message, error.code) },
        { status: 400 }
      );
    }
    if (!data) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to update employee');
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;
    const { id } = await params;

    const kind = employeeKind(new URL(request.url).searchParams.get('kind'));
    if (!kind) {
      return NextResponse.json({ error: 'Choose employee type: staff or teacher' }, { status: 400 });
    }

    let query = admin.from(kind).delete().eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { error } = await query;

    if (error) {
      if (error.code === '23503') {
        return NextResponse.json(
          {
            error:
              'This employee is linked to attendance, payroll, or leave records. Mark them inactive instead of deleting.',
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to delete employee');
  }
}
