import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  decodeMessageContent,
  encodeMessageContent,
  isUuid,
  loadGroupIdsForUser,
  MAX_MESSAGE_LENGTH,
  toChatMessage,
  toggleReaction,
} from '@/lib/messaging';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: 'A valid message id is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from('chat_messages')
      .select('id, group_id, sender_id, content, message_type, file_url, file_name, file_size, read_by, is_deleted, updated_at, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error || !row?.group_id) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const myGroupIds = await loadGroupIdsForUser(admin, user.id);
    if (!myGroupIds.includes(String(row.group_id))) {
      return NextResponse.json({ error: 'You are not a member of this conversation' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const decoded = decodeMessageContent(String(row.content ?? ''));
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.deleted === true) {
      if (row.sender_id !== user.id) {
        return NextResponse.json({ error: 'You can only delete your own messages' }, { status: 403 });
      }
      patch.is_deleted = true;
    }

    if (typeof body.content === 'string') {
      if (row.sender_id !== user.id) {
        return NextResponse.json({ error: 'You can only edit your own messages' }, { status: 403 });
      }
      const next = body.content.trim();
      if (!next) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
      if (next.length > MAX_MESSAGE_LENGTH) {
        return NextResponse.json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer` }, { status: 400 });
      }
      patch.content = encodeMessageContent(next, { ...decoded.meta, edited: true });
    }

    if (typeof body.reaction === 'string' && body.reaction.trim()) {
      const reactions = toggleReaction(decoded.meta.reactions || {}, body.reaction.trim().slice(0, 8), user.id);
      patch.content = encodeMessageContent(decoded.content, { ...decoded.meta, reactions });
    }

    if (typeof body.pollVote === 'number' && decoded.meta.poll) {
      const options = decoded.meta.poll.options.map((option, index) => {
        const votes = option.votes.filter((id) => id !== user.id);
        if (index === body.pollVote) votes.push(user.id);
        return { ...option, votes };
      });
      patch.content = encodeMessageContent(decoded.content, {
        ...decoded.meta,
        poll: { ...decoded.meta.poll, options },
      });
    }

    const { data: updated, error: updateError } = await admin
      .from('chat_messages')
      .update(patch)
      .eq('id', id)
      .select('id, sender_id, content, message_type, file_url, file_name, file_size, read_by, is_deleted, updated_at, created_at')
      .single();

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    const { data: sender } = await admin.from('users').select('full_name').eq('id', updated.sender_id).maybeSingle();
    return NextResponse.json({
      message: toChatMessage(
        updated as Parameters<typeof toChatMessage>[0],
        (sender as { full_name: string | null } | null)?.full_name?.trim() || 'Unknown user'
      ),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update message';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
