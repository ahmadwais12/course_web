import { NextResponse } from 'next/server';
import { getConversation, listMessages, softDeleteConversation, updateConversation } from '@/lib/ai/conversations';
import { resolveAIContext } from '@/lib/ai/context';
import { AIError } from '@/lib/ai/errors';
import { aiErrorResponse, readJson } from '@/lib/ai/http';
import { isUuid } from '@/lib/ai/security';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

async function ownedId(params: Params['params']) {
  const { id } = await params;
  if (!isUuid(id)) throw new AIError('conversation_not_found');
  return id;
}

export async function GET(request: Request, { params }: Params) {
  try {
    const id = await ownedId(params);
    const { ctx, admin } = await resolveAIContext();
    const url = new URL(request.url);
    const conversation = await getConversation(admin, ctx, id);
    const { messages, hasMore } = await listMessages(admin, ctx, id, {
      limit: Number(url.searchParams.get('limit')) || 30,
      before: url.searchParams.get('before'),
    });
    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        message_count: conversation.message_count,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        archived_at: conversation.archived_at,
      },
      messages,
      hasMore,
    });
  } catch (error) {
    return aiErrorResponse(error, 'ai/conversation');
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const id = await ownedId(params);
    const body = await readJson(request);
    const { ctx, admin } = await resolveAIContext();
    const updated = await updateConversation(admin, ctx, id, {
      title: typeof body.title === 'string' ? body.title : undefined,
      archived: typeof body.archived === 'boolean' ? body.archived : undefined,
    });
    return NextResponse.json({ id: updated.id, title: updated.title, archived_at: updated.archived_at });
  } catch (error) {
    return aiErrorResponse(error, 'ai/conversation');
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const id = await ownedId(params);
    const { ctx, admin } = await resolveAIContext();
    await softDeleteConversation(admin, ctx, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return aiErrorResponse(error, 'ai/conversation');
  }
}
