import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type DocumentRow = {
  id: string;
  student_id: string | null;
  document_type: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  issued_by: string | null;
  is_verified: boolean | null;
};

type StudentRow = {
  id: string;
  full_name: string | null;
  student_code: string | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('student_documents')
      .select('id, student_id, document_type, issue_date, expiry_date, issued_by, is_verified, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as DocumentRow[];
    const ids = [
      ...new Set(rows.map((r) => r.student_id).filter((id): id is string => Boolean(id))),
    ];
    const names = new Map<string, StudentRow>();

    if (ids.length) {
      const { data: students } = await supabase
        .from('students')
        .select('id, full_name, student_code')
        .in('id', ids);
      for (const s of (students ?? []) as StudentRow[]) {
        names.set(s.id, s);
      }
    }

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        student_id: r.student_id,
        student_name: (r.student_id && names.get(r.student_id)?.full_name) || '—',
        student_code: (r.student_id && names.get(r.student_id)?.student_code) || null,
        document_type: r.document_type,
        issue_date: r.issue_date,
        expiry_date: r.expiry_date,
        issued_by: r.issued_by,
        status: r.is_verified ? 'verified' : 'pending',
      }))
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch student documents';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
