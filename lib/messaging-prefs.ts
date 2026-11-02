import type { createSupabaseAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type DisappearAfter = 'off' | '24h' | '7d' | '90d';

export type MessagingPrefs = {
  favorites: string[];
  archived: string[];
  muted: string[];
  starred: string[];
  pinned: string[];
  blocked: string[];
  pinnedMessages: string[];
  hiddenMessages: string[];
  disappearing: Record<string, DisappearAfter>;
  mutedUntil: Record<string, string>;
};

export function emptyMessagingPrefs(): MessagingPrefs {
  return {
    favorites: [],
    archived: [],
    muted: [],
    starred: [],
    pinned: [],
    blocked: [],
    pinnedMessages: [],
    hiddenMessages: [],
    disappearing: {},
    mutedUntil: {},
  };
}

function prefsKey(userId: string) {
  return `messaging_prefs:${userId}`;
}

function asIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function asStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === 'string') out[key] = entry;
  }
  return out;
}

export function parseMessagingPrefs(value: unknown): MessagingPrefs {
  let raw = value;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return emptyMessagingPrefs();
    }
  }
  if (!raw || typeof raw !== 'object') return emptyMessagingPrefs();
  const row = raw as Record<string, unknown>;
  return {
    favorites: asIdList(row.favorites),
    archived: asIdList(row.archived),
    muted: asIdList(row.muted),
    starred: asIdList(row.starred),
    pinned: asIdList(row.pinned),
    blocked: asIdList(row.blocked),
    pinnedMessages: asIdList(row.pinnedMessages),
    hiddenMessages: asIdList(row.hiddenMessages),
    disappearing: asStringMap(row.disappearing) as MessagingPrefs['disappearing'],
    mutedUntil: asStringMap(row.mutedUntil),
  };
}

function toggleId(list: string[], id: string, on?: boolean) {
  const has = list.includes(id);
  const next = on ?? !has;
  if (next) return has ? list : [...list, id];
  return list.filter((item) => item !== id);
}

export function patchMessagingPrefs(
  prefs: MessagingPrefs,
  conversationId: string,
  patch: {
    favorite?: boolean;
    archived?: boolean;
    muted?: boolean;
    pinned?: boolean;
    blocked?: boolean;
    starredId?: string;
    starred?: boolean;
    pinMessageId?: string;
    pinnedMessage?: boolean;
    hideMessageId?: string;
    hidden?: boolean;
    disappearing?: DisappearAfter;
    muteHours?: number | null;
  }
): MessagingPrefs {
  const next: MessagingPrefs = {
    favorites: [...prefs.favorites],
    archived: [...prefs.archived],
    muted: [...prefs.muted],
    starred: [...prefs.starred],
    pinned: [...prefs.pinned],
    blocked: [...prefs.blocked],
    pinnedMessages: [...prefs.pinnedMessages],
    hiddenMessages: [...prefs.hiddenMessages],
    disappearing: { ...prefs.disappearing },
    mutedUntil: { ...prefs.mutedUntil },
  };
  if (patch.favorite !== undefined) next.favorites = toggleId(next.favorites, conversationId, patch.favorite);
  if (patch.archived !== undefined) next.archived = toggleId(next.archived, conversationId, patch.archived);
  if (patch.muted !== undefined) {
    next.muted = toggleId(next.muted, conversationId, patch.muted);
    if (patch.muted === false) delete next.mutedUntil[conversationId];
  }
  if (patch.pinned !== undefined) next.pinned = toggleId(next.pinned, conversationId, patch.pinned);
  if (patch.blocked !== undefined) next.blocked = toggleId(next.blocked, conversationId, patch.blocked);
  if (patch.starredId) next.starred = toggleId(next.starred, patch.starredId, patch.starred);
  if (patch.pinMessageId) next.pinnedMessages = toggleId(next.pinnedMessages, patch.pinMessageId, patch.pinnedMessage);
  if (patch.hideMessageId) next.hiddenMessages = toggleId(next.hiddenMessages, patch.hideMessageId, patch.hidden);
  if (patch.disappearing) next.disappearing[conversationId] = patch.disappearing;
  if (patch.muteHours === null) {
    next.muted = next.muted.filter((id) => id !== conversationId);
    delete next.mutedUntil[conversationId];
  } else if (typeof patch.muteHours === 'number') {
    next.muted = toggleId(next.muted, conversationId, true);
    if (patch.muteHours > 0) {
      next.mutedUntil[conversationId] = new Date(Date.now() + patch.muteHours * 3600 * 1000).toISOString();
    } else {
      next.mutedUntil[conversationId] = '9999-12-31T00:00:00.000Z';
    }
  }
  return next;
}

export async function loadMessagingPrefs(admin: AdminClient, userId: string) {
  const { data, error } = await admin
    .from('settings')
    .select('id, value')
    .eq('key', prefsKey(userId))
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== '42P01' && !/does not exist/i.test(error.message || '')) {
    throw new Error(error.message);
  }

  return {
    rowId: data?.id ? String(data.id) : undefined,
    prefs: parseMessagingPrefs(data?.value),
  };
}

export async function saveMessagingPrefs(
  admin: AdminClient,
  userId: string,
  prefs: MessagingPrefs,
  rowId?: string
) {
  const { data: userRow } = await admin.from('users').select('tenant_id').eq('id', userId).maybeSingle();
  const payload = {
    key: prefsKey(userId),
    value: JSON.stringify(prefs),
    category: 'messaging',
    tenant_id: userRow?.tenant_id ?? null,
    updated_at: new Date().toISOString(),
  };

  if (rowId) {
    const { error } = await admin.from('settings').update(payload).eq('id', rowId);
    if (error) throw new Error(error.message);
    return rowId;
  }

  const { data, error } = await admin
    .from('settings')
    .insert({ ...payload, created_at: new Date().toISOString() })
    .select('id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ? String(data.id) : undefined;
}

export function disappearHours(value: DisappearAfter | undefined): number | null {
  if (value === '24h') return 24;
  if (value === '7d') return 168;
  if (value === '90d') return 2160;
  return null;
}

export function applyPrefsToConversation<T extends { id: string }>(
  item: T,
  prefs: MessagingPrefs
): T & {
  isFavorite: boolean;
  isArchived: boolean;
  isMuted: boolean;
  isPinned: boolean;
  isBlocked: boolean;
  disappearingHours: number | null;
} {
  const until = prefs.mutedUntil[item.id];
  const muteActive = Boolean(until && new Date(until).getTime() > Date.now());
  return {
    ...item,
    isFavorite: prefs.favorites.includes(item.id),
    isArchived: prefs.archived.includes(item.id),
    isMuted: prefs.muted.includes(item.id) || muteActive,
    isPinned: prefs.pinned.includes(item.id),
    isBlocked: prefs.blocked.includes(item.id),
    disappearingHours: disappearHours(prefs.disappearing[item.id]),
  };
}
