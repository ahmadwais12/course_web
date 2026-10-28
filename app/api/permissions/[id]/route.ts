import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GUARD_NAME } from '@/lib/rbac';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'Permission name is required' }, { status: 400 });

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('permissions')
      .update({ name, guard_name: GUARD_NAME, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update permission';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { error } = await supabase.from('permissions').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete permission';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
