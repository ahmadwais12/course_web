import { NextResponse } from 'next/server';
import { portalsForNav } from '@/lib/portals';
import { requirePortalUser, safeRows } from '@/lib/portal-api';
import type { PortalDocumentRequest } from '@/lib/portal-types';

type DocumentRequestRow = {
  id: string;
  document_type: string;
  purpose: string | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
  approved_at: string | null;
  issued_at: string | null;
};

export async function GET() {
  const auth = await requirePortalUser((role) => portalsForNav(role).includes('employee'));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const rows = await safeRows<DocumentRequestRow>(
    auth.admin
      .from('document_requests')
      .select('id, document_type, purpose, status, notes, created_at, approved_at, issued_at')
      .eq('requester_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(50)
  );

  const requests: PortalDocumentRequest[] = rows.map((row) => ({
    id: row.id,
    documentType: row.document_type,
    purpose: row.purpose,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    issuedAt: row.issued_at,
  }));

  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const auth = await requirePortalUser((role) => portalsForNav(role).includes('employee'));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const documentType = typeof body?.documentType === 'string' ? body.documentType.trim() : '';
  const purpose = typeof body?.purpose === 'string' ? body.purpose.trim() : '';

  if (!documentType) {
    return NextResponse.json({ error: 'Select the document you need' }, { status: 400 });
  }
  if (documentType.length > 120 || purpose.length > 1000) {
    return NextResponse.json({ error: 'Request is too long' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error } = await auth.admin.from('document_requests').insert({
    tenant_id: auth.user.tenantId,
    requester_id: auth.user.id,
    document_type: documentType,
    purpose: purpose || null,
    status: 'pending',
    created_at: now,
    updated_at: now,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
