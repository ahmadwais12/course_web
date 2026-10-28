import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [coursesRes, studentsRes] = await Promise.all([
      supabase.from('courses').select('id, name, code, status').limit(20),
      supabase.from('students').select('id', { count: 'exact', head: true }),
    ]);

    const courses = coursesRes.data ?? [];

    return NextResponse.json({
      studentsCount: studentsRes.count ?? 0,
      activeClasses: courses.length,
      courses: courses.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        students: 0,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch teacher data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
