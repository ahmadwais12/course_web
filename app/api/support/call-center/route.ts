import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type CallbackRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  topic: string | null;
  preferred_date: string | null;
  preferred_time_from: string | null;
  preferred_time_to: string | null;
  status: string | null;
  created_at: string | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('callback_requests')
      .select(
        'id, full_name, phone, email, topic, preferred_date, preferred_time_from, preferred_time_to, status, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      ((data ?? []) as CallbackRow[]).map((row) => ({
        id: row.id,
        name: row.full_name,
        phone: row.phone,
        email: row.email,
        topic: row.topic,
        preferred_date: row.preferred_date,
        preferred_time_from: row.preferred_time_from,
        preferred_time_to: row.preferred_time_to,
        status: row.status ?? 'pending',
        created_at: row.created_at,
      }))
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch callback requests';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
