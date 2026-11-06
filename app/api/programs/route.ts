import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const { data, error } = await supabase
      .from('programs')
      .select('id, name, code, description, duration, credits, status, created_at, updated_at, nid')
      .order('name', { ascending: true })
      .limit(500);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load programs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await createClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const code = String(body.code ?? '').trim();
    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: profile } = await admin
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    const payload = {
      name,
      code,
      description: body.description ? String(body.description).trim() : null,
      duration: body.duration ? String(body.duration).trim() : null,
      credits: body.credits != null && body.credits !== '' ? Number(body.credits) : 0,
      status: String(body.status || 'active'),
      tenant_id: profile?.tenant_id ?? null,
    };

    const { data, error } = await admin.from('programs').insert(payload).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create program';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
