import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type TicketRow = {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  priority: string | null;
  status: string | null;
  location: string | null;
  reported_by: string | null;
  created_at: string | null;
};

type UserRow = { id: string; full_name: string | null };

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('support_tickets')
      .select('id, title, description, category, priority, status, location, reported_by, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as TicketRow[];
    const reporterIds = [
      ...new Set(rows.map((r) => r.reported_by).filter((id): id is string => Boolean(id))),
    ];
    const reporters = new Map<string, string | null>();

    if (reporterIds.length) {
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', reporterIds);
      for (const user of (users ?? []) as UserRow[]) {
        reporters.set(user.id, user.full_name);
      }
    }

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        priority: row.priority ?? 'normal',
        status: row.status ?? 'open',
        location: row.location,
        reported_by_name: row.reported_by ? reporters.get(row.reported_by) ?? null : null,
        created_at: row.created_at,
      }))
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch support tickets';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
