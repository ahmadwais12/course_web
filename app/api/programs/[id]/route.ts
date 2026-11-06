import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const auth = await createClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const body = await request.json();
    const admin = createSupabaseAdminClient();
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.name != null) payload.name = String(body.name).trim();
    if (body.code != null) payload.code = String(body.code).trim();
    if (body.description !== undefined) {
      payload.description = body.description ? String(body.description).trim() : null;
    }
    if (body.duration !== undefined) {
      payload.duration = body.duration ? String(body.duration).trim() : null;
    }
    if (body.credits !== undefined) {
      payload.credits = body.credits === '' || body.credits == null ? 0 : Number(body.credits);
    }
    if (body.status != null) payload.status = String(body.status);

    if (!payload.name && body.name != null) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data, error } = await admin.from('programs').update(payload).eq('id', id).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update program';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const auth = await createClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const admin = createSupabaseAdminClient();
    // Soft-deactivate first; hard delete if status column update fails.
    const soft = await admin
      .from('programs')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (!soft.error && soft.data) {
      return NextResponse.json({ ok: true, soft: true });
    }

    const { error } = await admin.from('programs').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete program';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
