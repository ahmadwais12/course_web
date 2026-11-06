import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GUARD_NAME } from '@/lib/rbac';

export async function GET() {
  try {
    const supabase = await createClient();
    let { data, error } = await supabase
      .from('permissions')
      .select('*')
      .eq('guard_name', GUARD_NAME)
      .is('deleted_at', null)
      .order('name');

    if (error && /deleted_at/i.test(error.message)) {
      const retry = await supabase
        .from('permissions')
        .select('*')
        .eq('guard_name', GUARD_NAME)
        .order('name');
      data = retry.data;
      error = retry.error;
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch permissions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'Permission name is required' }, { status: 400 });

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('permissions')
      .insert({ name, guard_name: GUARD_NAME })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create permission';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
