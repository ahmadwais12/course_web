import { NextResponse } from 'next/server';
import { isManagerRole, requireStaff } from '@/lib/system-access';
import { listMessageLogs, queueMessages } from '@/lib/communication-server';
import { isAudience, splitRecipients } from '@/lib/communication';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const access = await requireStaff();
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const items = await listMessageLogs(access.admin, 'email', access.tenantId);
    return NextResponse.json({ items, can_send: isManagerRole(access.role) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load email history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireStaff({ manage: true });
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const subject = String(body.subject ?? '').trim();
    const message = String(body.body ?? '').trim();
    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    const result = await queueMessages(access.admin, 'email', {
      senderId: access.user.id,
      tenantId: access.tenantId,
      recipients: splitRecipients(String(body.recipients ?? '')),
      audience: isAudience(body.audience) ? body.audience : null,
      message,
      subject,
    });
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to queue email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
