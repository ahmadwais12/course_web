import type { createSupabaseAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type ChatParticipant = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type ChatLastMessage = {
  text: string;
  at: string;
  senderId: string;
};

export type ConversationSummary = {
  id: string;
  type: 'direct' | 'group';
  name: string;
  description: string | null;
  avatarUrl: string | null;
  memberCount: number;
  members: ChatParticipant[];
  lastMessage: ChatLastMessage | null;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
};

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MAX_MESSAGE_LENGTH = 4000;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function uniqueStrings(values: unknown[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed && !out.includes(trimmed)) out.push(trimmed);
  }
  return out;
}

type GroupRow = {
  id: string;
  name: string | null;
  description: string | null;
  type: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

type MemberRow = {
  group_id: string;
  user_id: string | null;
  role: string | null;
};

type UserRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type LastMessageRow = {
  group_id: string;
  sender_id: string | null;
  content: string | null;
  message_type: string | null;
  created_at: string | null;
};

function displayName(user: UserRow | undefined, fallback: string) {
  return user?.full_name?.trim() || fallback;
}

function messagePreview(row: LastMessageRow): string {
  const text = row.content?.trim();
  if (text) return text;
  return row.message_type === 'file' ? 'Attachment' : 'Message';
}

export async function loadGroupIdsForUser(admin: AdminClient, userId: string) {
  const { data, error } = await admin
    .from('chat_group_members')
    .select('group_id')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return uniqueStrings(((data ?? []) as { group_id: string | null }[]).map((row) => row.group_id));
}

export async function loadMembersByGroup(admin: AdminClient, groupIds: string[]) {
  const map = new Map<string, ChatParticipant[]>();
  if (!groupIds.length) return map;

  const { data, error } = await admin
    .from('chat_group_members')
    .select('group_id, user_id, role')
    .in('group_id', groupIds);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as MemberRow[];
  const userIds = uniqueStrings(rows.map((row) => row.user_id));

  const usersById = new Map<string, UserRow>();
  if (userIds.length) {
    const { data: users, error: usersError } = await admin
      .from('users')
      .select('id, full_name, avatar_url')
      .in('id', userIds);
    if (usersError) throw new Error(usersError.message);
    for (const user of (users ?? []) as UserRow[]) usersById.set(user.id, user);
  }

  for (const row of rows) {
    if (!row.user_id) continue;
    const list = map.get(row.group_id) ?? [];
    list.push({
      id: row.user_id,
      name: displayName(usersById.get(row.user_id), 'Unknown user'),
      avatarUrl: usersById.get(row.user_id)?.avatar_url ?? null,
    });
    map.set(row.group_id, list);
  }

  return map;
}

export function toConversationSummary(
  group: GroupRow,
  members: ChatParticipant[],
  lastMessage: ChatLastMessage | null,
  currentUserId: string
): ConversationSummary {
  const type = group.type === 'group' ? 'group' : 'direct';
  const others = members.filter((member) => member.id !== currentUserId);
  const fallbackName = type === 'group' ? group.name?.trim() || 'Group chat' : 'Direct message';
  const name = type === 'direct' ? others[0]?.name ?? fallbackName : fallbackName;

  return {
    id: group.id,
    type,
    name,
    description: group.description,
    avatarUrl: type === 'group' ? group.avatar_url : others[0]?.avatarUrl ?? null,
    memberCount: members.length,
    members,
    lastMessage,
  };
}

export async function loadConversationSummaries(
  admin: AdminClient,
  currentUserId: string
): Promise<ConversationSummary[]> {
  const groupIds = await loadGroupIdsForUser(admin, currentUserId);
  if (!groupIds.length) return [];

  const { data: groupData, error: groupError } = await admin
    .from('chat_groups')
    .select('id, name, description, type, avatar_url, created_at')
    .in('id', groupIds)
    .eq('is_active', true);

  if (groupError) throw new Error(groupError.message);

  const groups = (groupData ?? []) as GroupRow[];
  if (!groups.length) return [];

  const activeIds = groups.map((group) => group.id);
  const membersByGroup = await loadMembersByGroup(admin, activeIds);

  const { data: messageData, error: messageError } = await admin
    .from('chat_messages')
    .select('group_id, sender_id, content, message_type, created_at')
    .in('group_id', activeIds)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(500);

  if (messageError) throw new Error(messageError.message);

  const lastByGroup = new Map<string, ChatLastMessage>();
  for (const row of (messageData ?? []) as LastMessageRow[]) {
    if (lastByGroup.has(row.group_id)) continue;
    if (!row.created_at) continue;
    lastByGroup.set(row.group_id, {
      text: messagePreview(row),
      at: row.created_at,
      senderId: row.sender_id ?? '',
    });
  }

  return groups
    .map((group) =>
      toConversationSummary(
        group,
        membersByGroup.get(group.id) ?? [],
        lastByGroup.get(group.id) ?? null,
        currentUserId
      )
    )
    .sort((a, b) => {
      const aAt = a.lastMessage?.at;
      const bAt = b.lastMessage?.at;
      if (aAt && bAt) return bAt.localeCompare(aAt);
      if (aAt) return -1;
      if (bAt) return 1;
      return a.name.localeCompare(b.name);
    });
}
