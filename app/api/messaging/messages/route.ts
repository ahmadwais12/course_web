import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  asMessageType,
  encodeMessageContent,
  isUuid,
  loadConversationSummaries,
  loadGroupIdsForUser,
  MAX_MESSAGE_LENGTH,
  toChatMessage,
  type ChatMessage,
  type ChatMessageType,
} from '@/lib/messaging';
import { uploadChatFile } from '@/lib/messaging-upload';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const conversationId = new URL(request.url).searchParams.get('conversationId');
    if (!isUuid(conversationId)) {
      return NextResponse.json({ error: 'A valid conversationId is required' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const myGroupIds = await loadGroupIdsForUser(admin, user.id);
    if (!myGroupIds.includes(conversationId)) {
      return NextResponse.json({ error: 'You are not a member of this conversation' }, { status: 403 });
    }

    const conversations = await loadConversationSummaries(admin, user.id);
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { data, error } = await admin
      .from('chat_messages')
      .select('id, sender_id, content, message_type, file_url, file_name, file_size, read_by, is_deleted, updated_at, created_at')
      .eq('group_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      const retry = await admin
        .from('chat_messages')
        .select('id, sender_id, content, message_type, created_at')
        .eq('group_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(500);
      if (retry.error) return NextResponse.json({ error: retry.error.message }, { status: 500 });
      const nameById = new Map(conversation.members.map((member) => [member.id, member.name]));
      const messages: ChatMessage[] = ((retry.data ?? []) as { id: string; sender_id: string | null; content: string | null; message_type: string | null; created_at: string | null }[])
        .filter((row) => row.id && row.created_at)
        .reverse()
        .map((row) => toChatMessage(row, nameById.get(row.sender_id ?? '') ?? 'Unknown user'));
      return NextResponse.json({ conversation, messages });
    }

    const { loadMessagingPrefs, disappearHours } = await import('@/lib/messaging-prefs');
    const { prefs } = await loadMessagingPrefs(admin, user.id).catch(() => ({
      prefs: { hiddenMessages: [] as string[], disappearing: {} as Record<string, 'off' | '24h' | '7d' | '90d'> },
    }));
    const hidden = new Set(prefs.hiddenMessages);
    const hours = disappearHours(prefs.disappearing[conversationId]);
    const cutoff = hours ? Date.now() - hours * 3600 * 1000 : 0;

    const nameById = new Map(conversation.members.map((member) => [member.id, member.name]));
    const messages: ChatMessage[] = ((data ?? []) as Record<string, unknown>[])
      .filter((row) => row.id && row.created_at)
      .reverse()
      .map((row) =>
        toChatMessage(
          {
            id: String(row.id),
            sender_id: row.sender_id ? String(row.sender_id) : null,
            content: row.content ? String(row.content) : null,
            message_type: row.message_type ? String(row.message_type) : null,
            file_url: row.file_url ? String(row.file_url) : null,
            file_name: row.file_name ? String(row.file_name) : null,
            file_size: typeof row.file_size === 'number' ? row.file_size : null,
            read_by: row.read_by,
            is_deleted: Boolean(row.is_deleted),
            updated_at: row.updated_at ? String(row.updated_at) : null,
            created_at: row.created_at ? String(row.created_at) : null,
          },
          nameById.get(row.sender_id ? String(row.sender_id) : '') ?? 'Unknown user'
        )
      )
      .filter((message) => {
        if (hidden.has(message.id)) return false;
        if (cutoff && new Date(message.createdAt).getTime() < cutoff) return false;
        return true;
      });

    return NextResponse.json({ conversation, messages, prefs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load messages';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function insertMessage(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  input: {
    conversationId: string;
    userId: string;
    content: string;
    messageType: ChatMessageType;
    fileUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
  }
) {
  const payload = {
    group_id: input.conversationId,
    sender_id: input.userId,
    content: input.content || null,
    message_type: input.messageType,
    file_url: input.fileUrl || null,
    file_name: input.fileName || null,
    file_size: input.fileSize ?? null,
    read_by: [input.userId],
  };
  let { data: created, error } = await admin
    .from('chat_messages')
    .insert(payload)
    .select('id, sender_id, content, message_type, file_url, file_name, file_size, read_by, created_at')
    .single();

  if (error) {
    const retry = await admin
      .from('chat_messages')
      .insert({
        group_id: input.conversationId,
        sender_id: input.userId,
        content: input.content || null,
        message_type: input.messageType,
      })
      .select('id, sender_id, content, message_type, created_at')
      .single();
    if (retry.error) throw new Error(error.message);
    created = retry.data as typeof created;
    error = retry.error;
  }

  const { data: sender } = await admin.from('users').select('full_name').eq('id', input.userId).maybeSingle();
  return toChatMessage(
    created as Parameters<typeof toChatMessage>[0],
    (sender as { full_name: string | null } | null)?.full_name?.trim() || 'You'
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createSupabaseAdminClient();
    const contentType = request.headers.get('content-type') || '';
    let conversationId = '';
    let content = '';
    let messageType: ChatMessageType = 'text';
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let replyTo = '';
    let replyName = '';
    let replyText = '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      conversationId = String(form.get('conversationId') ?? '').trim();
      content = String(form.get('content') ?? '').trim();
      replyTo = String(form.get('replyTo') ?? '').trim();
      replyName = String(form.get('replyName') ?? '').trim();
      replyText = String(form.get('replyText') ?? '').trim();
      const file = form.get('file');
      if (file instanceof File && file.size > 0) {
        const uploaded = await uploadChatFile(admin, file, conversationId, user.id);
        fileUrl = uploaded.url;
        fileName = file.name;
        fileSize = file.size;
        messageType = asMessageType(form.get('messageType') || uploaded.messageType);
        if (!content) {
          content =
            messageType === 'image'
              ? 'Photo'
              : messageType === 'voice'
                ? 'Voice message'
                : messageType === 'video'
                  ? 'Video'
                  : file.name;
        }
      }
    } else {
      const body = await request.json().catch(() => ({}));
      conversationId = String(body.conversationId ?? '').trim();
      content = String(body.content ?? '').trim();
      messageType = asMessageType(body.messageType);
      fileUrl = body.fileUrl ? String(body.fileUrl) : null;
      fileName = body.fileName ? String(body.fileName) : null;
      fileSize = typeof body.fileSize === 'number' ? body.fileSize : null;
      replyTo = String(body.replyTo ?? '').trim();
      replyName = String(body.replyName ?? '').trim();
      replyText = String(body.replyText ?? '').trim();
      if (body.poll?.question && Array.isArray(body.poll.options)) {
        const options = body.poll.options
          .map((option: unknown) => String(option ?? '').trim())
          .filter(Boolean)
          .slice(0, 6)
          .map((text: string) => ({ text, votes: [] as string[] }));
        if (options.length >= 2) {
          content = encodeMessageContent(content || String(body.poll.question), {
            poll: { question: String(body.poll.question).trim(), options },
            replyTo: replyTo || undefined,
            replyName: replyName || undefined,
            replyText: replyText || undefined,
          });
          replyTo = '';
        }
      }
    }

    if (replyTo) {
      content = encodeMessageContent(content, {
        replyTo,
        replyName: replyName || undefined,
        replyText: replyText || undefined,
      });
    }

    if (!isUuid(conversationId)) {
      return NextResponse.json({ error: 'A valid conversationId is required' }, { status: 400 });
    }
    if (!content && !fileUrl) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }

    const myGroupIds = await loadGroupIdsForUser(admin, user.id);
    if (!myGroupIds.includes(conversationId)) {
      return NextResponse.json({ error: 'You are not a member of this conversation' }, { status: 403 });
    }

    const message = await insertMessage(admin, {
      conversationId,
      userId: user.id,
      content,
      messageType,
      fileUrl,
      fileName,
      fileSize,
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send message';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
