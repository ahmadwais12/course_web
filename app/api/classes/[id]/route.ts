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
    if (body.grade !== undefined) payload.grade = body.grade ? String(body.grade).trim() : null;
    if (body.year !== undefined) {
      payload.year = body.year != null && body.year !== '' ? String(body.year) : null;
    }
    if (body.program_id !== undefined) {
      payload.program_id = body.program_id ? String(body.program_id) : null;
    }
    if (body.active != null || body.status != null) {
      payload.active = body.active !== false && body.status !== 'inactive';
    }

    const { data, error } = await admin.from('classes').update(payload).eq('id', id).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      ...data,
      status: data.active === false ? 'inactive' : 'active',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update class';
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
    const soft = await admin
      .from('classes')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (!soft.error && soft.data) {
      return NextResponse.json({ ok: true, soft: true });
    }

    const { error } = await admin.from('classes').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete class';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
