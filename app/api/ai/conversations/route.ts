import { NextResponse } from 'next/server';
import { listConversations } from '@/lib/ai/conversations';
import { resolveAIContext } from '@/lib/ai/context';
import { aiErrorResponse } from '@/lib/ai/http';

export const dynamic = 'force-dynamic';

/** The signed-in user's own conversations (never another user's or another tenant's). */
export async function GET(request: Request) {
  try {
    const { ctx, admin } = await resolveAIContext();
    const url = new URL(request.url);
    const result = await listConversations(admin, ctx, {
      search: url.searchParams.get('search') ?? undefined,
      page: Number(url.searchParams.get('page')) || 1,
      pageSize: Number(url.searchParams.get('pageSize')) || 20,
      archived: url.searchParams.get('archived') === 'true',
    });
    return NextResponse.json({
      data: result.conversations.map((c) => ({
        id: c.id,
        title: c.title,
        message_count: c.message_count,
        context_reference: c.context_reference,
        created_at: c.created_at,
        updated_at: c.updated_at,
        archived_at: c.archived_at,
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  } catch (error) {
    return aiErrorResponse(error, 'ai/conversations');
  }
}
