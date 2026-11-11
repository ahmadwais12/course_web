import { NextResponse } from 'next/server';
import { requirePortalUser } from '@/lib/portal-api';

const TYPES = new Set(['general', 'notice', 'event', 'news', 'holiday', 'emergency', 'achievement']);
const PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);
const AUDIENCES = new Set(['students', 'all']);

export async function POST(request: Request) {
  const auth = await requirePortalUser((role) => role === 'teacher');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { admin, user } = auth;

  try {
    const body = (await request.json()) as {
      title?: string;
      content?: string;
      type?: string;
      priority?: string;
      audience?: string;
      attachmentUrl?: string;
    };

    const title = String(body.title ?? '').trim();
    const content = String(body.content ?? '').trim();
    const type = TYPES.has(String(body.type)) ? String(body.type) : 'notice';
    const priority = PRIORITIES.has(String(body.priority)) ? String(body.priority) : 'normal';
    const audience = AUDIENCES.has(String(body.audience)) ? String(body.audience) : 'students';

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('announcements')
      .insert({
        tenant_id: user.tenantId,
        title,
        content,
        type,
        priority,
        audience,
        status: 'published',
        publish_date: now.slice(0, 10),
        attachment_url: String(body.attachmentUrl ?? '').trim() || null,
        created_by: user.id,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to publish announcement';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
