import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isUuid, loadConversationSummaries, loadGroupIdsForUser, uniqueStrings } from '@/lib/messaging';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: 'A valid conversation id is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createSupabaseAdminClient();
    const myGroupIds = await loadGroupIdsForUser(admin, user.id);
    if (!myGroupIds.includes(id)) {
      return NextResponse.json({ error: 'You are not a member of this conversation' }, { status: 403 });
    }

    const conversations = await loadConversationSummaries(admin, user.id);
    const conversation = conversations.find((item) => item.id === id);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const memberIds = conversation.members.map((member) => member.id);
    let people: Record<string, unknown>[] = [];
    if (memberIds.length) {
      const { data, error } = await admin
        .from('users')
        .select('id, full_name, email, phone, role, is_active, avatar_url, address')
        .in('id', memberIds);
      if (error && /address/i.test(error.message)) {
        const retry = await admin
          .from('users')
          .select('id, full_name, email, phone, role, is_active, avatar_url')
          .in('id', memberIds);
        if (retry.error) {
          return NextResponse.json({ error: retry.error.message }, { status: 500 });
        }
        people = (retry.data ?? []) as Record<string, unknown>[];
      } else if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      } else {
        people = (data ?? []) as Record<string, unknown>[];
      }
    }

    const peopleById = new Map(people.map((row) => [String(row.id), row]));
    const members = conversation.members.map((member) => {
      const row = peopleById.get(member.id);
      return {
        id: member.id,
        name: String(row?.full_name || member.name || 'Unnamed user'),
        email: row?.email ? String(row.email) : null,
        phone: row?.phone ? String(row.phone) : null,
        role: row?.role ? String(row.role) : null,
        isActive: row?.is_active == null ? true : Boolean(row.is_active),
        avatarUrl: row?.avatar_url ? String(row.avatar_url) : member.avatarUrl,
        address: row?.address ? String(row.address) : null,
        isMe: member.id === user.id,
      };
    });

    const { data: lastFromOther } = await admin
      .from('chat_messages')
      .select('created_at')
      .eq('group_id', id)
      .neq('sender_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      conversation,
      members,
      currentUserId: user.id,
      lastSeen: lastFromOther?.created_at ? String(lastFromOther.created_at) : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: 'A valid conversation id is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createSupabaseAdminClient();
    const myGroupIds = await loadGroupIdsForUser(admin, user.id);
    if (!myGroupIds.includes(id)) {
      return NextResponse.json({ error: 'You are not a member of this conversation' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const now = new Date().toISOString();

    if (body.unread === true) {
      await admin
        .from('chat_group_members')
        .update({ last_read_at: '1970-01-01T00:00:00.000Z' })
        .eq('group_id', id)
        .eq('user_id', user.id);
    }

    if (body.clear === true) {
      await admin
        .from('chat_messages')
        .update({ is_deleted: true, updated_at: now })
        .eq('group_id', id);
    }

    if (typeof body.name === 'string' || typeof body.description === 'string') {
      const groupPatch: Record<string, unknown> = { updated_at: now };
      if (typeof body.name === 'string' && body.name.trim()) groupPatch.name = body.name.trim();
      if (typeof body.description === 'string') groupPatch.description = body.description.trim() || null;
      await admin.from('chat_groups').update(groupPatch).eq('id', id);
    }

    if (body.leave === true || body.deleteChat === true) {
      await admin.from('chat_group_members').delete().eq('group_id', id).eq('user_id', user.id);
    }

    if (typeof body.removeMemberId === 'string' && isUuid(body.removeMemberId) && body.removeMemberId !== user.id) {
      await admin.from('chat_group_members').delete().eq('group_id', id).eq('user_id', body.removeMemberId);
    }

    if (Array.isArray(body.addMemberIds)) {
      const memberIds = uniqueStrings(body.addMemberIds).filter((memberId) => memberId !== user.id && isUuid(memberId));
      if (memberIds.length) {
        const { data: existing } = await admin
          .from('chat_group_members')
          .select('user_id')
          .eq('group_id', id);
        const already = new Set((existing ?? []).map((row) => String(row.user_id)));
        const toAdd = memberIds.filter((memberId) => !already.has(memberId));
        if (toAdd.length) {
          await admin.from('chat_group_members').insert(
            toAdd.map((memberId) => ({ group_id: id, user_id: memberId, role: 'member' }))
          );
        }
      }
    }

    if (body.read === true) {
      await admin
        .from('chat_group_members')
        .update({ last_read_at: now })
        .eq('group_id', id)
        .eq('user_id', user.id);

      const { data: unread } = await admin
        .from('chat_messages')
        .select('id, read_by')
        .eq('group_id', id)
        .eq('is_deleted', false)
        .neq('sender_id', user.id)
        .limit(500);

      for (const row of unread ?? []) {
        const readBy = Array.isArray(row.read_by) ? row.read_by.map(String) : [];
        if (readBy.includes(user.id)) continue;
        await admin
          .from('chat_messages')
          .update({ read_by: [...readBy, user.id] })
          .eq('id', row.id);
      }
    }

    const { emptyMessagingPrefs, loadMessagingPrefs, patchMessagingPrefs, saveMessagingPrefs } = await import(
      '@/lib/messaging-prefs'
    );
    let next = emptyMessagingPrefs();
    try {
      const loaded = await loadMessagingPrefs(admin, user.id);
      next = patchMessagingPrefs(loaded.prefs, id, {
        favorite: typeof body.favorite === 'boolean' ? body.favorite : undefined,
        archived: typeof body.archived === 'boolean' ? body.archived : undefined,
        muted: typeof body.muted === 'boolean' ? body.muted : undefined,
        pinned: typeof body.pinned === 'boolean' ? body.pinned : undefined,
        blocked: typeof body.blocked === 'boolean' ? body.blocked : undefined,
        starredId: body.starredId ? String(body.starredId) : undefined,
        starred: typeof body.starred === 'boolean' ? body.starred : undefined,
        pinMessageId: body.pinMessageId ? String(body.pinMessageId) : undefined,
        pinnedMessage: typeof body.pinnedMessage === 'boolean' ? body.pinnedMessage : undefined,
        hideMessageId: body.hideMessageId ? String(body.hideMessageId) : undefined,
        hidden: typeof body.hidden === 'boolean' ? body.hidden : undefined,
        disappearing: ['off', '24h', '7d', '90d'].includes(String(body.disappearing))
          ? (body.disappearing as 'off' | '24h' | '7d' | '90d')
          : undefined,
        muteHours: body.muteHours === null || typeof body.muteHours === 'number' ? body.muteHours : undefined,
      });
      await saveMessagingPrefs(admin, user.id, next, loaded.rowId);
    } catch {
      next = patchMessagingPrefs(emptyMessagingPrefs(), id, {
        favorite: typeof body.favorite === 'boolean' ? body.favorite : undefined,
        archived: typeof body.archived === 'boolean' ? body.archived : undefined,
        muted: typeof body.muted === 'boolean' ? body.muted : undefined,
        pinned: typeof body.pinned === 'boolean' ? body.pinned : undefined,
        blocked: typeof body.blocked === 'boolean' ? body.blocked : undefined,
        starredId: body.starredId ? String(body.starredId) : undefined,
        starred: typeof body.starred === 'boolean' ? body.starred : undefined,
        pinMessageId: body.pinMessageId ? String(body.pinMessageId) : undefined,
        pinnedMessage: typeof body.pinnedMessage === 'boolean' ? body.pinnedMessage : undefined,
        hideMessageId: body.hideMessageId ? String(body.hideMessageId) : undefined,
        hidden: typeof body.hidden === 'boolean' ? body.hidden : undefined,
        disappearing: ['off', '24h', '7d', '90d'].includes(String(body.disappearing))
          ? (body.disappearing as 'off' | '24h' | '7d' | '90d')
          : undefined,
        muteHours: body.muteHours === null || typeof body.muteHours === 'number' ? body.muteHours : undefined,
      });
    }

    const conversations = await loadConversationSummaries(admin, user.id);
    const conversation = conversations.find((item) => item.id === id) ?? null;
    return NextResponse.json({ conversation, prefs: next });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update conversation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
