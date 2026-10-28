import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type MessageRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string | null;
  category: string | null;
  source: string | null;
  status: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('contact_messages')
      .select(
        'id, full_name, email, phone, subject, message, category, source, status, is_read, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      ((data ?? []) as MessageRow[]).map((row) => ({
        id: row.id,
        name: row.full_name,
        email: row.email,
        phone: row.phone,
        subject: row.subject,
        message: row.message,
        category: row.category,
        source: row.source,
        status: row.status ?? (row.is_read ? 'read' : 'new'),
        created_at: row.created_at,
      }))
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch messages';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
