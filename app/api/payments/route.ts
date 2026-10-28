import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('payments')
      .select('id, payment_number, amount, payment_method, payment_date, payment_type, status, student_id')
      .order('payment_date', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch payments';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
