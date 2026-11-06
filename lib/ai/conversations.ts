import type { SupabaseClient } from '@supabase/supabase-js';
import { AIError, isMissingTableError } from '@/lib/ai/errors';
import type { AIConversationRow, AIMessageMetadata, AIMessageRow, AIRequestContext } from '@/lib/ai/types';

const CONVERSATION_COLUMNS =
  'id, title, context_type, context_reference, summary, summary_message_count, message_count, created_at, updated_at, archived_at';
const MESSAGE_COLUMNS = 'id, conversation_id, role, content, response_metadata, feedback, created_at';

export type ConversationRecord = AIConversationRow & { summary: string | null; summary_message_count: number };

function dbError(error: { code?: string; message?: string }, label: string): never {
  if (isMissingTableError(error)) throw new AIError('ai_tables_missing', error.message);
  throw new AIError('internal', `${label}: ${error.message}`);
}

type Ownable = { eq(column: string, value: string): Ownable; is(column: string, value: null): Ownable };

/** Every conversation query is pinned to the owner and their tenant. */
export function owned<Q>(query: Q, ctx: AIRequestContext): Q {
  let q = (query as unknown as Ownable).eq('user_id', ctx.userId).is('deleted_at', null);
  q = ctx.tenantId ? q.eq('tenant_id', ctx.tenantId) : q.is('tenant_id', null);
  return q as unknown as Q;
}

export function titleFromMessage(message: string) {
  const clean = message.replace(/\s+/g, ' ').trim();
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean || 'New conversation';
}

export async function listConversations(
  admin: SupabaseClient,
  ctx: AIRequestContext,
  opts: { search?: string; page?: number; pageSize?: number; archived?: boolean }
) {
  const pageSize = Math.min(Math.max(opts.pageSize ?? 20, 1), 50);
  const page = Math.max(opts.page ?? 1, 1);
  let query = owned(admin.from('ai_conversations').select(CONVERSATION_COLUMNS, { count: 'exact' }), ctx);
  query = opts.archived ? query.not('archived_at', 'is', null) : query.is('archived_at', null);
  const search = (opts.search ?? '').trim().slice(0, 100).replace(/[%_,()]/g, ' ');
  if (search) query = query.ilike('title', `%${search}%`);
  const { data, error, count } = await query
    .order('updated_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) dbError(error, 'list conversations');
  return { conversations: (data ?? []) as ConversationRecord[], total: count ?? 0, page, pageSize };
}

export async function getConversation(admin: SupabaseClient, ctx: AIRequestContext, id: string) {
  const { data, error } = await owned(admin.from('ai_conversations').select(CONVERSATION_COLUMNS), ctx)
    .eq('id', id)
    .maybeSingle();
  if (error) dbError(error, 'get conversation');
  if (!data) throw new AIError('conversation_not_found');
  return data as ConversationRecord;
}

export async function createConversation(
  admin: SupabaseClient,
  ctx: AIRequestContext,
  input: { title: string; contextType?: string | null; contextReference?: string | null }
) {
  const { data, error } = await admin
    .from('ai_conversations')
    .insert({
      tenant_id: ctx.tenantId,
      organization_id: ctx.organizationId,
      user_id: ctx.userId,
      title: input.title,
      context_type: input.contextType ?? null,
      context_reference: input.contextReference ?? null,
    })
    .select(CONVERSATION_COLUMNS)
    .single();
  if (error) dbError(error, 'create conversation');
  return data as ConversationRecord;
}

export async function updateConversation(
  admin: SupabaseClient,
  ctx: AIRequestContext,
  id: string,
  patch: { title?: string; archived?: boolean }
) {
  await getConversation(admin, ctx, id);
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) update.title = patch.title.replace(/\s+/g, ' ').trim().slice(0, 120) || 'Conversation';
  if (patch.archived !== undefined) update.archived_at = patch.archived ? new Date().toISOString() : null;
  const { data, error } = await owned(admin.from('ai_conversations').update(update), ctx)
    .eq('id', id)
    .select(CONVERSATION_COLUMNS)
    .single();
  if (error) dbError(error, 'update conversation');
  return data as ConversationRecord;
}

export async function softDeleteConversation(admin: SupabaseClient, ctx: AIRequestContext, id: string) {
  await getConversation(admin, ctx, id);
  const { error } = await owned(admin.from('ai_conversations').update({ deleted_at: new Date().toISOString() }), ctx).eq(
    'id',
    id
  );
  if (error) dbError(error, 'delete conversation');
}

/** Newest-first pagination via `before` (created_at cursor); returned oldest-first for display. */
export async function listMessages(
  admin: SupabaseClient,
  ctx: AIRequestContext,
  conversationId: string,
  opts: { limit?: number; before?: string | null } = {}
) {
  await getConversation(admin, ctx, conversationId);
  const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
  let query = admin
    .from('ai_messages')
    .select(MESSAGE_COLUMNS)
    .eq('conversation_id', conversationId)
    .eq('user_id', ctx.userId);
  if (opts.before) query = query.lt('created_at', opts.before);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit + 1);
  if (error) dbError(error, 'list messages');
  const rows = (data ?? []) as AIMessageRow[];
  return { messages: rows.slice(0, limit).reverse(), hasMore: rows.length > limit };
}

export async function insertMessage(
  admin: SupabaseClient,
  ctx: AIRequestContext,
  input: { conversationId: string; role: 'user' | 'assistant'; content: string; metadata?: AIMessageMetadata | null }
) {
  const { data, error } = await admin
    .from('ai_messages')
    .insert({
      conversation_id: input.conversationId,
      tenant_id: ctx.tenantId,
      user_id: ctx.userId,
      role: input.role,
      content: input.content,
      response_metadata: input.metadata ?? null,
    })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) dbError(error, 'insert message');
  return data as AIMessageRow;
}

export async function deleteMessage(admin: SupabaseClient, ctx: AIRequestContext, id: string) {
  await admin.from('ai_messages').delete().eq('id', id).eq('user_id', ctx.userId);
}

export async function getMessage(admin: SupabaseClient, ctx: AIRequestContext, id: string) {
  const { data, error } = await admin
    .from('ai_messages')
    .select(MESSAGE_COLUMNS)
    .eq('id', id)
    .eq('user_id', ctx.userId)
    .maybeSingle();
  if (error) dbError(error, 'get message');
  return (data as AIMessageRow | null) ?? null;
}

export async function touchConversation(
  admin: SupabaseClient,
  ctx: AIRequestContext,
  id: string,
  patch: { messageCount: number; summary?: string; summaryMessageCount?: number }
) {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString(), message_count: patch.messageCount };
  if (patch.summary !== undefined) {
    update.summary = patch.summary;
    update.summary_message_count = patch.summaryMessageCount ?? patch.messageCount;
  }
  const { error } = await owned(admin.from('ai_conversations').update(update), ctx).eq('id', id);
  if (error) console.error('[ai] touchConversation failed:', error.message);
}

export async function setMessageFeedback(
  admin: SupabaseClient,
  ctx: AIRequestContext,
  messageId: string,
  feedback: -1 | 1 | null,
  comment: string | null
) {
  const message = await getMessage(admin, ctx, messageId);
  if (!message || message.role !== 'assistant') throw new AIError('not_found');
  await getConversation(admin, ctx, message.conversation_id);
  const { error } = await admin
    .from('ai_messages')
    .update({
      feedback,
      feedback_comment: comment ? comment.slice(0, 1000) : null,
      feedback_at: feedback === null ? null : new Date().toISOString(),
    })
    .eq('id', messageId)
    .eq('user_id', ctx.userId);
  if (error) dbError(error, 'feedback');
}
