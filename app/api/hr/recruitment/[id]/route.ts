import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { openingValues } from '@/lib/hr-recruitment';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin } = auth.session;
    const { id } = await params;

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

    const result = openingValues(body, false);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
    if (Object.keys(result.values).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { data, error } = await admin
      .from('recruitment')
      .update(result.values)
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: 'Opening not found' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to update opening');
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin } = auth.session;
    const { id } = await params;

    const { error } = await admin.from('recruitment').delete().eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return NextResponse.json(
          {
            error:
              'This opening has job applications attached. Close the position instead of deleting it.',
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to delete opening');
  }
}
