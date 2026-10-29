import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isUuid, uniqueStrings } from '@/lib/messaging';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const name = String(body.name ?? '').trim();
    const description = String(body.description ?? '').trim();
    const memberIds = uniqueStrings(Array.isArray(body.memberIds) ? body.memberIds : []).filter(
      (id) => id !== user.id
    );

    if (!name) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }
    if (name.length > 120) {
      return NextResponse.json({ error: 'Group name must be 120 characters or fewer' }, { status: 400 });
    }
    if (!memberIds.every(isUuid)) {
      return NextResponse.json({ error: 'memberIds must be valid user ids' }, { status: 400 });
    }
    if (!memberIds.length) {
      return NextResponse.json({ error: 'Select at least one member' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: existingUsers, error: usersError } = await admin
      .from('users')
      .select('id')
      .in('id', memberIds);

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }
    if ((existingUsers ?? []).length !== memberIds.length) {
      return NextResponse.json({ error: 'One or more members were not found' }, { status: 400 });
    }

    const { data: created, error: createError } = await admin
      .from('chat_groups')
      .insert({
        name,
        description: description || null,
        type: 'group',
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
      ...memberIds.map((memberId) => ({
        group_id: conversationId,
        user_id: memberId,
        role: 'member',
      })),
    ]);

    if (memberError) {
      await admin.from('chat_group_members').delete().eq('group_id', conversationId);
      await admin.from('chat_groups').delete().eq('id', conversationId);
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return NextResponse.json({ conversationId }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create group';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
