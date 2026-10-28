import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [coursesRes, gradesRes, paymentsRes] = await Promise.all([
      supabase.from('courses').select('id, name, code, progress, status').limit(20),
      supabase.from('grades').select('id, marks, date, exam_id').limit(20),
      supabase.from('payments').select('id, amount, payment_type, payment_date, status, due_date').limit(20),
    ]);

    const courses = coursesRes.data ?? [];
    const grades = gradesRes.data ?? [];
    const payments = paymentsRes.data ?? [];

    const avgGrade =
      grades.length > 0
        ? (
            grades.reduce((sum, g) => sum + Number((g as { marks?: number }).marks ?? 0), 0) /
            grades.length
          ).toFixed(1)
        : 'N/A';

    return NextResponse.json({
      stats: {
        courses: courses.length,
        avgGrade,
        attendance: '0%',
      },
      courses,
      grades,
      payments: payments.map((p) => ({
        ...p,
        type: (p as { payment_type?: string }).payment_type,
        dueDate: (p as { payment_date?: string }).payment_date,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch student data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
