'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, ArrowLeft, Bell, BellOff, Link2, Lock, Share2, Star, UserMinus, X } from 'lucide-react';
import {
  EmptyState,
  ErrorBanner,
  PortButton,
  RowActions,
  SegmentedControl,
  StatusChip,
  statusToneFromValue,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import UserAvatar from '@/components/messaging/UserAvatar';
import type { ChatMessage, ConversationSummary } from '@/lib/messaging';
import { isDirectMessagingType } from '@/lib/messaging-types';
import { cn } from '@/lib/utils';

export type ProfileMember = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  isActive: boolean;
  avatarUrl: string | null;
  address: string | null;
  isMe: boolean;
};

const URL_RE = /https?:\/\/[^\s<>"']+/gi;

function formatRole(role: string | null) {
  if (!role) return 'Member';
  return role.replace(/[_-]+/g, ' ');
}

function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function extractLinks(messages: ChatMessage[]) {
  const links: string[] = [];
  for (const message of messages) {
    const matches = message.content.match(URL_RE) ?? [];
    for (const raw of matches) {
      const url = raw.replace(/[),.;]+$/, '');
      if (url && !links.includes(url)) links.push(url);
    }
  }
  return links;
}

export function useConversationProfile(conversationId: string | null) {
  const [conversation, setConversation] = useState<ConversationSummary | null>(null);
  const [members, setMembers] = useState<ProfileMember[]>([]);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/messaging/conversations/${conversationId}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load profile');
      setConversation(data.conversation as ConversationSummary);
      setMembers(Array.isArray(data.members) ? (data.members as ProfileMember[]) : []);
      setLastSeen(typeof data.lastSeen === 'string' ? data.lastSeen : null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) {
      setConversation(null);
      setMembers([]);
      setLastSeen(null);
      setError(null);
      return;
    }
    load();
  }, [conversationId, load]);

  return { conversation, members, lastSeen, loading, error };
}

type ContactInfoPanelProps = {
  conversationId: string;
  fallback?: ConversationSummary | null;
  messages?: ChatMessage[];
  starredIds?: string[];
  onClose?: () => void;
  onMessage?: () => void;
  onFavorite?: () => void;
  onMute?: () => void;
  onArchive?: () => void;
  onAddMembers?: () => void;
  onBlock?: () => void;
  onLeave?: () => void;
  onExport?: () => void;
  onEditGroup?: () => void;
  onDisappear?: () => void;
  onRemoveMember?: (id: string) => void;
  onStarredJump?: (id: string) => void;
  lastSeen?: string | null;
  variant?: 'drawer' | 'page';
  className?: string;
};

export default function ContactInfoPanel({
  conversationId,
  fallback,
  messages = [],
  starredIds = [],
  onClose,
  onMessage,
  onFavorite,
  onMute,
  onArchive,
  onAddMembers,
  onBlock,
  onLeave,
  onExport,
  onEditGroup,
  onDisappear,
  onRemoveMember,
  onStarredJump,
  lastSeen: lastSeenProp,
  variant = 'drawer',
  className,
}: ContactInfoPanelProps) {
  const { conversation, members, lastSeen, loading, error } = useConversationProfile(conversationId);
  const [ownMessages, setOwnMessages] = useState<ChatMessage[]>([]);
  const [mediaTab, setMediaTab] = useState('media');
  const selected = conversation || fallback;
  const isDirect = selected ? isDirectMessagingType(selected.type) : false;

  useEffect(() => {
    if (messages.length || !conversationId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/messaging/messages?conversationId=${encodeURIComponent(conversationId)}`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (!res.ok || cancelled) return;
        setOwnMessages(Array.isArray(data.messages) ? (data.messages as ChatMessage[]) : []);
      } catch {
        if (!cancelled) setOwnMessages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, messages.length]);

  const person = useMemo(() => {
    if (!isDirect) return null;
    return members.find((member) => !member.isMe) || null;
  }, [isDirect, members]);

  const thread = messages.length ? messages : ownMessages;
  const title = isDirect ? person?.name || selected?.name || 'Contact info' : selected?.name || 'Group';
  const seen = lastSeenProp || lastSeen;
  const subtitle = isDirect
    ? seen
      ? `Last seen ${new Date(seen).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
      : person?.email || formatRole(person?.role || null)
    : selected?.description || `${selected?.memberCount ?? members.length} members`;
  const links = useMemo(() => extractLinks(thread), [thread]);
  const media = thread.filter((item) => item.messageType === 'image' && item.fileUrl);
  const docs = thread.filter((item) => item.messageType === 'file' || item.messageType === 'video');
  const starred = thread.filter((item) => starredIds.includes(item.id));

  async function handleShare() {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/messaging/${conversationId}`
        : `/messaging/${conversationId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success('Profile link copied');
    } catch {
      toast.error('Could not share this profile');
    }
  }

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 w-full flex-col bg-card',
        variant === 'drawer' && 'border-s border-border',
        className
      )}
    >
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-3">
        {onClose && (
          <PortButton variant="ghost" className="h-9 w-9 px-0" onClick={onClose} aria-label="Close contact info">
            {variant === 'page' ? <ArrowLeft size={18} /> : <X size={18} />}
          </PortButton>
        )}
        <h2 className="m-0 min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
          {isDirect ? 'Contact info' : 'Group info'}
        </h2>
        {onMessage && (
          <PortButton variant="ghost" className="h-9 px-3 text-xs" onClick={onMessage}>
            Message
          </PortButton>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && (
          <div className="p-3">
            <ErrorBanner message={error} />
          </div>
        )}

        {loading && !selected ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Loading profile…</p>
        ) : !selected ? (
          <EmptyState message="This conversation was not found." />
        ) : (
          <>
            <div className="flex flex-col items-center px-5 py-8 text-center">
              <UserAvatar name={title} src={selected.avatarUrl || person?.avatarUrl} size="lg" className="h-[118px] w-[118px] text-4xl" />
              <h3 className="mb-0 mt-4 text-[22px] font-semibold tracking-tight text-foreground">{title}</h3>
              <p className="m-0 mt-1 max-w-[16rem] text-sm text-muted-foreground">{subtitle}</p>
              <div className="mt-3">
                <StatusChip
                  label={
                    isDirect
                      ? person?.isActive === false
                        ? 'offline'
                        : 'online'
                      : `${selected.memberCount} member${selected.memberCount === 1 ? '' : 's'}`
                  }
                  tone={isDirect ? (person?.isActive === false ? 'purple' : 'green') : 'blue'}
                />
              </div>
              <div className="mt-5 flex items-start justify-center gap-4">
                <PortButton variant="ghost" className="h-auto flex-col gap-1 px-3 py-2" onClick={handleShare}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Share2 size={18} />
                  </span>
                  <span className="text-[11px] font-semibold">Share</span>
                </PortButton>
                {onMute && (
                  <PortButton variant="ghost" className="h-auto flex-col gap-1 px-3 py-2" onClick={onMute}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {selected.isMuted ? <BellOff size={18} /> : <Bell size={18} />}
                    </span>
                    <span className="text-[11px] font-semibold">{selected.isMuted ? 'Unmute' : 'Mute'}</span>
                  </PortButton>
                )}
                {onFavorite && (
                  <PortButton variant="ghost" className="h-auto flex-col gap-1 px-3 py-2" onClick={onFavorite}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Star size={18} className={selected.isFavorite ? 'fill-current' : ''} />
                    </span>
                    <span className="text-[11px] font-semibold">{selected.isFavorite ? 'Saved' : 'Favorite'}</span>
                  </PortButton>
                )}
              </div>
            </div>

            {isDirect && person && (
              <section className="border-t border-border px-5 py-4">
                <p className="m-0 text-sm text-foreground">
                  {person.role ? `This is a ${formatRole(person.role)} account.` : 'This is a user account.'}
                </p>
                <dl className="mt-4 space-y-3">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Email</dt>
                    <dd className="mt-0.5 text-sm text-foreground">{person.email || '—'}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Phone</dt>
                      <dd className="mt-0.5 text-sm text-foreground">{person.phone || '—'}</dd>
                    </div>
                    <StatusChip
                      label={person.isActive ? 'active' : 'inactive'}
                      tone={statusToneFromValue(person.isActive ? 'active' : 'inactive')}
                    />
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Address</dt>
                    <dd className="mt-0.5 text-sm text-foreground">{person.address || '—'}</dd>
                  </div>
                </dl>
              </section>
            )}

            <section className="border-t border-border px-5 py-4">
              <p className="m-0 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Lock size={14} />
                Messages and calls are end-to-end encrypted.
              </p>
              {onDisappear && (
                <PortButton variant="ghost" className="mt-3 h-8 w-full justify-start px-0" onClick={onDisappear}>
                  Disappearing messages
                  {selected.disappearingHours ? ` · ${selected.disappearingHours}h` : ' · Off'}
                </PortButton>
              )}
              {!isDirect && onEditGroup && (
                <PortButton variant="ghost" className="mt-1 h-8 w-full justify-start px-0" onClick={onEditGroup}>
                  Edit group info
                </PortButton>
              )}
            </section>

            {!isDirect && (
              <section className="border-t border-border px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="m-0 text-sm font-semibold text-foreground">
                    {members.length} member{members.length === 1 ? '' : 's'}
                  </p>
                  {onAddMembers && (
                    <PortButton variant="secondary" className="h-8" onClick={onAddMembers}>
                      Add
                    </PortButton>
                  )}
                </div>
                <ul className="mt-3 m-0 list-none space-y-1 p-0">
                  {members.map((member) => (
                    <li key={member.id} className="flex items-center gap-3 rounded-xl px-1 py-2">
                      <UserAvatar name={member.name} src={member.avatarUrl} />
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-sm font-semibold text-foreground">
                          {member.name}
                          {member.isMe ? ' (you)' : ''}
                        </p>
                        <p className="m-0 truncate text-xs capitalize text-muted-foreground">
                          {member.email || formatRole(member.role)}
                        </p>
                      </div>
                      <StatusChip
                        label={member.isActive ? 'active' : 'inactive'}
                        tone={member.isActive ? 'green' : 'purple'}
                      />
                      {onRemoveMember && !member.isMe && (
                        <RowActions
                          maxInline={0}
                          items={[
                            {
                              key: 'remove',
                              label: 'Remove',
                              icon: <UserMinus size={14} />,
                              onClick: () => onRemoveMember(member.id),
                              danger: true,
                            },
                          ]}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="border-t border-border px-5 py-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="m-0 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Link2 size={16} />
                  Media, links and docs
                </p>
              </div>
              <SegmentedControl
                value={mediaTab}
                onChange={setMediaTab}
                options={[
                  { value: 'media', label: `Media ${media.length}` },
                  { value: 'links', label: `Links ${links.length}` },
                  { value: 'docs', label: `Docs ${docs.length}` },
                ]}
                className="w-full"
              />
              {mediaTab === 'media' &&
                (media.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No photos in this chat yet.</p>
                ) : (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {media.slice(0, 12).map((item) => (
                      <a key={item.id} href={item.fileUrl || '#'} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.fileUrl || ''} alt={item.fileName || 'Photo'} className="aspect-square w-full object-cover" />
                      </a>
                    ))}
                  </div>
                ))}
              {mediaTab === 'links' &&
                (links.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No links shared in this chat yet.</p>
                ) : (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {links.slice(0, 9).map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex aspect-square flex-col justify-end overflow-hidden rounded-lg border border-border bg-muted p-2 text-start hover:bg-accent"
                      >
                        <span className="truncate text-[10px] font-semibold text-foreground">{hostnameOf(url)}</span>
                      </a>
                    ))}
                  </div>
                ))}
              {mediaTab === 'docs' &&
                (docs.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No documents in this chat yet.</p>
                ) : (
                  <ul className="mt-3 m-0 list-none space-y-2 p-0">
                    {docs.map((item) => (
                      <li key={item.id}>
                        <a href={item.fileUrl || '#'} target="_blank" rel="noreferrer" className="text-sm font-medium text-foreground">
                          {item.fileName || item.content}
                        </a>
                      </li>
                    ))}
                  </ul>
                ))}
            </section>

            <section className="border-t border-border px-5 py-4">
              <p className="m-0 text-sm font-semibold text-foreground">Starred messages</p>
              {starred.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No starred messages.</p>
              ) : (
                <ul className="mt-2 m-0 list-none space-y-2 p-0">
                  {starred.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="w-full rounded-lg bg-muted px-3 py-2 text-start text-sm"
                        onClick={() => onStarredJump?.(item.id)}
                      >
                        {item.poll?.question || item.content || item.fileName || 'Starred message'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2 border-t border-border px-5 py-4">
              {onExport && (
                <PortButton variant="secondary" className="w-full" onClick={onExport}>
                  Export chat
                </PortButton>
              )}
              {onArchive && (
                <PortButton variant="secondary" className="w-full" onClick={onArchive}>
                  <Archive size={16} />
                  {selected.isArchived ? 'Unarchive chat' : 'Archive chat'}
                </PortButton>
              )}
              {onBlock && isDirect && (
                <PortButton variant="danger" className="w-full" onClick={onBlock}>
                  {selected.isBlocked ? 'Unblock' : 'Block'}
                </PortButton>
              )}
              {onLeave && !isDirect && (
                <PortButton variant="danger" className="w-full" onClick={onLeave}>
                  Leave group
                </PortButton>
              )}
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
