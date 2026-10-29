import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  isUuid,
  loadConversationSummaries,
  loadGroupIdsForUser,
  loadMembersByGroup,
} from '@/lib/messaging';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createSupabaseAdminClient();
    const conversations = await loadConversationSummaries(admin, user.id);

    return NextResponse.json({ currentUserId: user.id, conversations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load conversations';
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
    const targetUserId = String(body.userId ?? '').trim();

    if (!isUuid(targetUserId)) {
      return NextResponse.json({ error: 'A valid userId is required' }, { status: 400 });
    }
    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'You cannot start a chat with yourself' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: target, error: targetError } = await admin
      .from('users')
      .select('id, full_name')
      .eq('id', targetUserId)
      .maybeSingle();

    if (targetError) {
      return NextResponse.json({ error: targetError.message }, { status: 500 });
    }
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const myGroupIds = await loadGroupIdsForUser(admin, user.id);
    if (myGroupIds.length) {
      const { data: directGroups, error: directError } = await admin
        .from('chat_groups')
        .select('id')
        .in('id', myGroupIds)
        .eq('type', 'direct')
        .eq('is_active', true);

      if (directError) {
        return NextResponse.json({ error: directError.message }, { status: 500 });
      }

      const candidateIds = (directGroups ?? []).map((group: { id: string }) => group.id);
      const membersByGroup = await loadMembersByGroup(admin, candidateIds);

      for (const candidateId of candidateIds) {
        const memberIds = (membersByGroup.get(candidateId) ?? []).map((member) => member.id).sort();
        if (
          memberIds.length === 2 &&
          memberIds[0] === [user.id, targetUserId].sort()[0] &&
          memberIds[1] === [user.id, targetUserId].sort()[1]
        ) {
          return NextResponse.json({ conversationId: candidateId, created: false });
        }
      }
    }

    const { data: created, error: createError } = await admin
      .from('chat_groups')
      .insert({
        name: target.full_name || 'Direct message',
        type: 'direct',
        created_by: user.id,
      })
      .select('id')
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    const conversationId = (created as { id: string }).id;

    const { error: memberError } = await admin.from('chat_group_members').insert([
      { group_id: conversationId, user_id: user.id, role: 'admin' },
      { group_id: conversationId, user_id: targetUserId, role: 'member' },
    ]);

    if (memberError) {
      await admin.from('chat_group_members').delete().eq('group_id', conversationId);
      await admin.from('chat_groups').delete().eq('id', conversationId);
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return NextResponse.json({ conversationId, created: true }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start conversation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
