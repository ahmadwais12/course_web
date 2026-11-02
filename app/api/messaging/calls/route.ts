import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isUuid, loadGroupIdsForUser, toChatMessage } from '@/lib/messaging';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const conversationId = String(body.conversationId ?? '').trim();
    const callType = body.callType === 'video' ? 'video' : 'voice';
    const action = String(body.action ?? 'start');

    if (!isUuid(conversationId)) {
      return NextResponse.json({ error: 'A valid conversationId is required' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const myGroupIds = await loadGroupIdsForUser(admin, user.id);
    if (!myGroupIds.includes(conversationId)) {
      return NextResponse.json({ error: 'You are not a member of this conversation' }, { status: 403 });
    }

    if (action === 'end' && body.callId) {
      const endedAt = new Date();
      const { data: existing } = await admin
        .from('chat_calls')
        .select('id, started_at, call_type')
        .eq('id', String(body.callId))
        .maybeSingle();
      const started = existing?.started_at ? new Date(String(existing.started_at)) : endedAt;
      const duration = Math.max(0, Math.round((endedAt.getTime() - started.getTime()) / 1000));
      await admin
        .from('chat_calls')
        .update({ status: 'ended', ended_at: endedAt.toISOString(), duration })
        .eq('id', String(body.callId));

      const minutes = Math.floor(duration / 60);
      const seconds = String(duration % 60).padStart(2, '0');
      const label = `${existing?.call_type === 'video' ? 'Video' : 'Voice'} call · ${minutes}:${seconds}`;
      const { data: created } = await admin
        .from('chat_messages')
        .insert({
          group_id: conversationId,
          sender_id: user.id,
          content: label,
          message_type: 'text',
          read_by: [user.id],
        })
        .select('id, sender_id, content, message_type, created_at, read_by')
        .single();

      const { data: sender } = await admin.from('users').select('full_name').eq('id', user.id).maybeSingle();
      const message = created
        ? toChatMessage(
            created as Parameters<typeof toChatMessage>[0],
            (sender as { full_name: string | null } | null)?.full_name?.trim() || 'You'
          )
        : null;
      return NextResponse.json({ duration, message });
    }

    const { data: call, error } = await admin
      .from('chat_calls')
      .insert({
        group_id: conversationId,
        caller_id: user.id,
        call_type: callType,
        status: 'initiated',
      })
      .select('id, call_type, status, started_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ call }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start call';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
