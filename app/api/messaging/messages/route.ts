import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  isUuid,
  loadConversationSummaries,
  loadGroupIdsForUser,
  MAX_MESSAGE_LENGTH,
  type ChatMessage,
} from '@/lib/messaging';

type MessageRow = {
  id: string;
  sender_id: string | null;
  content: string | null;
  message_type: string | null;
  created_at: string | null;
};

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
      .select('id, sender_id, content, message_type, created_at')
      .eq('group_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const nameById = new Map(conversation.members.map((member) => [member.id, member.name]));
    const messages: ChatMessage[] = ((data ?? []) as MessageRow[])
      .filter((row) => row.id && row.created_at)
      .reverse()
      .map((row) => ({
        id: row.id,
        senderId: row.sender_id ?? '',
        senderName: nameById.get(row.sender_id ?? '') ?? 'Unknown user',
        content: row.content?.trim() || (row.message_type === 'file' ? 'Attachment' : ''),
        createdAt: row.created_at as string,
      }));

    return NextResponse.json({ conversation, messages });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load messages';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const conversationId = String(body.conversationId ?? '').trim();
    const content = String(body.content ?? '').trim();

    if (!isUuid(conversationId)) {
      return NextResponse.json({ error: 'A valid conversationId is required' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const myGroupIds = await loadGroupIdsForUser(admin, user.id);
    if (!myGroupIds.includes(conversationId)) {
      return NextResponse.json({ error: 'You are not a member of this conversation' }, { status: 403 });
    }

    const { data: created, error } = await admin
      .from('chat_messages')
      .insert({
        group_id: conversationId,
        sender_id: user.id,
        content,
        message_type: 'text',
      })
      .select('id, sender_id, content, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: sender } = await admin
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const row = created as { id: string; sender_id: string; content: string; created_at: string };
    const message: ChatMessage = {
      id: row.id,
      senderId: row.sender_id,
      senderName: (sender as { full_name: string | null } | null)?.full_name?.trim() || 'You',
      content: row.content,
      createdAt: row.created_at,
    };

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send message';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
