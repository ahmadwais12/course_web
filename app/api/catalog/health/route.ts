import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const TABLES = [
  'programs',
  'courses',
  'classes',
  'durations',
  'course_durations',
  'program_durations',
] as const;

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const result: Record<string, unknown> = {};

  for (const table of TABLES) {
    const probe = await admin.from(table).select('*').limit(1);
    if (probe.error) {
      result[table] = {
        ok: false,
        error: probe.error.message,
        code: probe.error.code,
      };
      continue;
    }
    const row = (probe.data?.[0] || null) as Record<string, unknown> | null;
    result[table] = {
      ok: true,
      columns: row ? Object.keys(row) : [],
      sample: row,
      count_hint: probe.data?.length ?? 0,
    };
  }

  // Also count rows
  for (const table of TABLES) {
    const entry = result[table] as { ok?: boolean };
    if (!entry?.ok) continue;
    const counted = await admin.from(table).select('id', { count: 'exact', head: true });
    (result[table] as Record<string, unknown>).total = counted.count ?? null;
  }

  return NextResponse.json(result);
}
