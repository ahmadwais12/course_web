import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('courses')
      .select('id, name, code, description, credits, status, teacher_id, progress')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch courses';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
