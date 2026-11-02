import type { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { applyPrefsToConversation, emptyMessagingPrefs, loadMessagingPrefs } from '@/lib/messaging-prefs';

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type ChatParticipant = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type ChatMessageType = 'text' | 'file' | 'image' | 'video' | 'voice';

export type ChatLastMessage = {
  text: string;
  at: string;
  senderId: string;
  messageType: ChatMessageType;
};

export type ConversationSummary = {
  id: string;
  type: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  memberCount: number;
  members: ChatParticipant[];
  lastMessage: ChatLastMessage | null;
  unreadCount: number;
  isFavorite: boolean;
  isArchived: boolean;
  isMuted: boolean;
  isPinned: boolean;
  isBlocked: boolean;
  disappearingHours: number | null;
};

export type PollOption = { text: string; votes: string[] };

export type MessageMeta = {
  replyTo?: string;
  replyName?: string;
  replyText?: string;
  reactions?: Record<string, string[]>;
  edited?: boolean;
  poll?: { question: string; options: PollOption[] };
};

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  updatedAt: string | null;
  messageType: ChatMessageType;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  readBy: string[];
  isDeleted: boolean;
  replyTo: string | null;
  replyName: string | null;
  replyText: string | null;
  reactions: Record<string, string[]>;
  edited: boolean;
  rawContent: string;
  poll: { question: string; options: PollOption[] } | null;
};

const META_RE = /^@@meta:([\s\S]*?)@@\n?/;

export function decodeMessageContent(raw: string): { content: string; meta: MessageMeta } {
  const match = raw.match(META_RE);
  if (!match) return { content: raw, meta: {} };
  try {
    const meta = JSON.parse(match[1]) as MessageMeta;
    return { content: raw.slice(match[0].length), meta: meta && typeof meta === 'object' ? meta : {} };
  } catch {
    return { content: raw, meta: {} };
  }
}

export function encodeMessageContent(text: string, meta: MessageMeta = {}): string {
  const reactions = meta.reactions
    ? Object.fromEntries(Object.entries(meta.reactions).filter(([, ids]) => ids.length))
    : undefined;
  const next: MessageMeta = {
    ...(meta.replyTo ? { replyTo: meta.replyTo, replyName: meta.replyName, replyText: meta.replyText } : {}),
    ...(reactions && Object.keys(reactions).length ? { reactions } : {}),
    ...(meta.edited ? { edited: true } : {}),
    ...(meta.poll ? { poll: meta.poll } : {}),
  };
  if (!next.replyTo && !next.reactions && !next.edited && !next.poll) return text;
  return `@@meta:${JSON.stringify(next)}@@\n${text}`;
}

export function toggleReaction(
  reactions: Record<string, string[]>,
  emoji: string,
  userId: string
): Record<string, string[]> {
  const next: Record<string, string[]> = { ...reactions };
  const current = new Set(next[emoji] ?? []);
  if (current.has(userId)) current.delete(userId);
  else current.add(userId);
  if (current.size) next[emoji] = [...current];
  else delete next[emoji];
  return next;
}

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_CHAT_FILE_BYTES = 15 * 1024 * 1024;

export function toChatMessage(
  row: {
    id: string;
    sender_id?: string | null;
    content?: string | null;
    created_at?: string | null;
    message_type?: string | null;
    file_url?: string | null;
    file_name?: string | null;
    file_size?: number | null;
    read_by?: unknown;
    is_deleted?: boolean | null;
    updated_at?: string | null;
  },
  senderName: string
): ChatMessage {
  const messageType = asMessageType(row.message_type);
  const rawContent = row.content ?? '';
  const decoded = decodeMessageContent(rawContent);
  const content = decoded.content.trim();
  return {
    id: row.id,
    senderId: row.sender_id ?? '',
    senderName,
    content:
      content ||
      (messageType === 'image'
        ? 'Photo'
        : messageType === 'video'
          ? 'Video'
          : messageType === 'voice'
            ? 'Voice message'
            : messageType === 'file'
              ? row.file_name || 'Document'
              : ''),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    messageType,
    fileUrl: row.file_url ? String(row.file_url) : null,
    fileName: row.file_name ? String(row.file_name) : null,
    fileSize: typeof row.file_size === 'number' ? row.file_size : null,
    readBy: parseReadBy(row.read_by),
    isDeleted: Boolean(row.is_deleted),
    replyTo: decoded.meta.replyTo || null,
    replyName: decoded.meta.replyName || null,
    replyText: decoded.meta.replyText || null,
    reactions: decoded.meta.reactions || {},
    edited: Boolean(decoded.meta.edited),
    rawContent,
    poll: decoded.meta.poll || null,
  };
}

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

export function asMessageType(value: unknown): ChatMessageType {
  const type = String(value || 'text');
  if (type === 'file' || type === 'image' || type === 'video' || type === 'voice') return type;
  return 'text';
}

export function parseReadBy(value: unknown): string[] {
  if (Array.isArray(value)) return uniqueStrings(value);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? uniqueStrings(parsed) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function messagePreview(row: LastMessageRow): string {
  const text = decodeMessageContent(row.content?.trim() || '').content.trim();
  if (text) return text;
  const type = asMessageType(row.message_type);
  if (type === 'image') return 'Photo';
  if (type === 'video') return 'Video';
  if (type === 'voice') return 'Voice message';
  if (type === 'file') return 'Document';
  return 'Message';
}

export function messageTypeFromMime(mime: string, fallback: ChatMessageType = 'file'): ChatMessageType {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'voice';
  return fallback;
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
  const type = (group.type || 'direct').trim() || 'direct';
  const isDirect = type === 'direct';
  const others = members.filter((member) => member.id !== currentUserId);
  const fallbackName = isDirect ? 'Direct message' : group.name?.trim() || 'Group chat';
  const name = isDirect ? others[0]?.name ?? fallbackName : fallbackName;

  return {
    id: group.id,
    type,
    name,
    description: group.description,
    avatarUrl: isDirect ? others[0]?.avatarUrl ?? null : group.avatar_url,
    memberCount: members.length,
    members,
    lastMessage,
    unreadCount: 0,
    isFavorite: false,
    isArchived: false,
    isMuted: false,
    isPinned: false,
    isBlocked: false,
    disappearingHours: null,
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
    .limit(800);

  if (messageError) throw new Error(messageError.message);

  const { data: readRows } = await admin
    .from('chat_group_members')
    .select('group_id, last_read_at')
    .eq('user_id', currentUserId)
    .in('group_id', activeIds);

  const lastReadByGroup = new Map<string, string>();
  for (const row of (readRows ?? []) as { group_id: string; last_read_at: string | null }[]) {
    if (row.last_read_at) lastReadByGroup.set(row.group_id, row.last_read_at);
  }

  const lastByGroup = new Map<string, ChatLastMessage>();
  const unreadByGroup = new Map<string, number>();
  for (const row of (messageData ?? []) as LastMessageRow[]) {
    if (!lastByGroup.has(row.group_id) && row.created_at) {
      lastByGroup.set(row.group_id, {
        text: messagePreview(row),
        at: row.created_at,
        senderId: row.sender_id ?? '',
        messageType: asMessageType(row.message_type),
      });
    }
    if (!row.created_at || row.sender_id === currentUserId) continue;
    const lastRead = lastReadByGroup.get(row.group_id);
    if (lastRead && row.created_at <= lastRead) continue;
    unreadByGroup.set(row.group_id, (unreadByGroup.get(row.group_id) ?? 0) + 1);
  }

  const { prefs } = await loadMessagingPrefs(admin, currentUserId).catch(() => ({
    prefs: emptyMessagingPrefs(),
  }));

  return groups
    .map((group) =>
      applyPrefsToConversation(
        {
          ...toConversationSummary(
            group,
            membersByGroup.get(group.id) ?? [],
            lastByGroup.get(group.id) ?? null,
            currentUserId
          ),
          unreadCount: unreadByGroup.get(group.id) ?? 0,
        },
        prefs
      )
    )
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      const aAt = a.lastMessage?.at;
      const bAt = b.lastMessage?.at;
      if (aAt && bAt) return bAt.localeCompare(aAt);
      if (aAt) return -1;
      if (bAt) return 1;
      return a.name.localeCompare(b.name);
    });
}
