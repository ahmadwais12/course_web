import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type ClassRow = {
  id: string;
  name: string | null;
  grade: string | null;
  year: string | number | null;
  teacher_id: string | null;
  program_id: string | null;
  student_count: number | null;
  active: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  nid?: number | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, grade, year, teacher_id, program_id, student_count, active, created_at, updated_at, nid')
      .order('name', { ascending: true })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as ClassRow[];

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        grade: row.grade,
        year: row.year,
        program_id: row.program_id,
        teacher_id: row.teacher_id,
        student_count: Number(row.student_count ?? 0),
        active: row.active !== false,
        status: row.active === false ? 'inactive' : 'active',
        created_at: row.created_at ?? null,
        updated_at: row.updated_at ?? null,
        nid: row.nid ?? null,
      }))
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch classes';
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
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const admin = createSupabaseAdminClient();
    const { data: profile } = await admin
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    const payload = {
      name,
      grade: body.grade ? String(body.grade).trim() : null,
      year: body.year != null && body.year !== '' ? String(body.year) : null,
      program_id: body.program_id ? String(body.program_id) : null,
      active: body.active !== false && body.status !== 'inactive',
      tenant_id: profile?.tenant_id ?? null,
      student_count: 0,
    };

    const { data, error } = await admin.from('classes').insert(payload).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(
      {
        ...data,
        status: data.active === false ? 'inactive' : 'active',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create class';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
