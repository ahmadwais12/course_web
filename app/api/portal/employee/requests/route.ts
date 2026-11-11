import { NextResponse } from 'next/server';
import { requirePortalUser } from '@/lib/portal-api';

const CATEGORIES = new Set(['hardware', 'software', 'network', 'account', 'access', 'bug', 'feature_request', 'other']);
const PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);

export async function POST(request: Request) {
  const auth = await requirePortalUser((role) => role !== 'student');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { admin, user } = auth;

  try {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      category?: string;
      priority?: string;
    };

    const title = String(body.title ?? '').trim();
    const description = String(body.description ?? '').trim();
    const category = CATEGORIES.has(String(body.category)) ? String(body.category) : 'other';
    const priority = PRIORITIES.has(String(body.priority)) ? String(body.priority) : 'medium';

    if (!title || !description) {
      return NextResponse.json({ error: 'Subject and details are required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('support_tickets')
      .insert({
        tenant_id: user.tenantId,
        title,
        description,
        category,
        priority,
        status: 'open',
        reported_by: user.id,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit HR request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
