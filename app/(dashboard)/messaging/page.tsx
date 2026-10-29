'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MessagesSquare, Plus, Send, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState, ErrorBanner, PageHeader, PortButton, SearchBar, SectionPanel } from '@/components/ports';
import { TextAreaField } from '@/components/ports/InputField';
import { toast } from '@/components/ui/Toast';
import UserAvatar from '@/components/messaging/UserAvatar';
import type { ChatMessage, ConversationSummary } from '@/lib/messaging';

function formatTime(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatListTime(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return formatTime(value);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function dateSeparatorLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function sortConversations(items: ConversationSummary[]) {
  return [...items].sort((a, b) => {
    const aAt = a.lastMessage?.at;
    const bAt = b.lastMessage?.at;
    if (aAt && bAt) return bAt.localeCompare(aAt);
    if (aAt) return -1;
    if (bAt) return 1;
    return a.name.localeCompare(b.name);
  });
}

function MessagingWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'direct' | 'group'>('direct');
  const [query, setQuery] = useState('');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('c'));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const requestRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const manualSelectionRef = useRef(false);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/messaging/conversations', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load conversations');
      const list = Array.isArray(data.conversations) ? (data.conversations as ConversationSummary[]) : [];
      setConversations(list);
      setCurrentUserId(typeof data.currentUserId === 'string' ? data.currentUserId : null);
      setError(null);
      setSelectedId((prev) => {
        if (prev || manualSelectionRef.current) return prev;
        if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 768px)').matches) {
          return null;
        }
        return list[0]?.id ?? null;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(message);
      if (!silent) toast.error(message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string, silent = false) => {
    const requestId = ++requestRef.current;
    if (!silent) {
      setMessagesLoading(true);
      setMessagesError(null);
    }
    try {
      const res = await fetch(
        `/api/messaging/messages?conversationId=${encodeURIComponent(conversationId)}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load messages');
      if (requestId !== requestRef.current) return;
      setMessages(Array.isArray(data.messages) ? (data.messages as ChatMessage[]) : []);
      setMessagesLoading(false);
      const conversation = data.conversation as ConversationSummary | undefined;
      if (conversation) {
        setConversations((prev) =>
          prev.map((item) => (item.id === conversation.id ? { ...item, ...conversation } : item))
        );
      }
    } catch (err) {
      if (requestId !== requestRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to load messages';
      if (silent) return;
      setMessagesError(message);
      if (message.toLowerCase().includes('not a member')) {
        setSelectedId(null);
        setMessages([]);
      }
    } finally {
      if (requestId === requestRef.current && !silent) setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    const timer = setInterval(() => loadConversations(true), 30000);
    return () => clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setMessagesError(null);
      return;
    }
    loadMessages(selectedId);
    const timer = setInterval(() => loadMessages(selectedId, true), 15000);
    return () => clearInterval(timer);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, messagesLoading, selectedId]);

  const selected = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const directCount = conversations.filter((item) => item.type === 'direct').length;
  const groupCount = conversations.filter((item) => item.type === 'group').length;

  const visibleConversations = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return conversations.filter((item) => {
      if (item.type !== tab) return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        (item.lastMessage?.text ?? '').toLowerCase().includes(needle) ||
        item.members.some((member) => member.name.toLowerCase().includes(needle))
      );
    });
  }, [conversations, tab, query]);

  function selectConversation(id: string) {
    manualSelectionRef.current = false;
    setSelectedId(id);
    setDraft('');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/messaging?c=${id}`);
    }
  }

  function backToList() {
    manualSelectionRef.current = true;
    setSelectedId(null);
    setMessages([]);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/messaging');
    }
  }

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || sending) return;
    const content = draft.trim();
    if (!content) return;

    setSending(true);
    try {
      const res = await fetch('/api/messaging/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedId, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');
      if (selectedIdRef.current !== selectedId) return;
      const message = data.message as ChatMessage;
      setMessages((prev) => [...prev, message]);
      setConversations((prev) =>
        sortConversations(
          prev.map((item) =>
            item.id === selectedId
              ? {
                  ...item,
                  lastMessage: { text: message.content, at: message.createdAt, senderId: message.senderId },
                }
              : item
          )
        )
      );
      setDraft('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <>
      <PageHeader
        title="Messaging"
        description="Direct messages and group conversations with your team."
        actions={
          <PortButton variant="primary" onClick={() => router.push('/messaging/new')}>
            <span className="inline-flex items-center gap-2">
              <Plus size={16} /> New conversation
            </span>
          </PortButton>
        }
      />

      {error && <ErrorBanner message={error} />}

      <SectionPanel bodyClassName="p-0">
        <div className="flex h-[calc(100dvh-215px)] min-h-[520px]">
          <aside
            className={cn(
              'w-full flex-col border-border md:flex md:w-80 md:border-e',
              selectedId ? 'hidden md:flex' : 'flex'
            )}
          >
            <div className="border-b border-border p-3 space-y-3">
              <div className="grid grid-cols-2 gap-1 rounded-[9px] bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setTab('direct')}
                  className={cn(
                    'h-8 rounded-[7px] text-xs font-semibold transition-colors',
                    tab === 'direct'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Direct ({directCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTab('group')}
                  className={cn(
                    'h-8 rounded-[7px] text-xs font-semibold transition-colors',
                    tab === 'group'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Groups ({groupCount})
                </button>
              </div>
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder={tab === 'direct' ? 'Search direct messages…' : 'Search groups…'}
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <p className="p-4 text-sm text-muted-foreground">Loading conversations…</p>
              ) : visibleConversations.length === 0 ? (
                <EmptyState
                  message={
                    query
                      ? 'No conversations match your search.'
                      : tab === 'direct'
                        ? 'No direct messages yet.'
                        : 'No group chats yet.'
                  }
                >
                  <PortButton
                    variant="ghost"
                    className="mt-2 h-8"
                    onClick={() => router.push('/messaging/new')}
                  >
                    Start one
                  </PortButton>
                </EmptyState>
              ) : (
                <ul className="m-0 list-none p-0">
                  {visibleConversations.map((item) => {
                    const active = item.id === selectedId;
                    return (
                      <li key={item.id} className="border-b border-border/60 last:border-b-0">
                        <button
                          type="button"
                          onClick={() => selectConversation(item.id)}
                          className={cn(
                            'flex w-full items-center gap-3 px-3 py-3 text-start transition-colors',
                            active ? 'bg-muted' : 'hover:bg-muted/60'
                          )}
                        >
                          <UserAvatar name={item.name} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className="truncate text-sm font-semibold text-foreground">
                                {item.name}
                              </span>
                              <span className="shrink-0 text-[11px] text-muted-foreground">
                                {formatListTime(item.lastMessage?.at)}
                              </span>
                            </span>
                            <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              {item.type === 'group' && <Users size={12} className="shrink-0" />}
                              <span className="truncate">
                                {item.lastMessage?.text ?? 'No messages yet'}
                              </span>
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          <section
            className={cn(
              'min-w-0 flex-1 flex-col bg-background/40 md:flex',
              selectedId ? 'flex' : 'hidden md:flex'
            )}
          >
            {!selected ? (
              <EmptyState
                message="Select a conversation to start chatting."
                className="m-auto py-16"
              >
                <MessagesSquare size={28} className="mx-auto mb-2 text-muted-foreground" />
                <PortButton
                  variant="secondary"
                  className="mt-2"
                  onClick={() => router.push('/messaging/new')}
                >
                  New conversation
                </PortButton>
              </EmptyState>
            ) : (
              <>
                <header className="flex items-center gap-3 border-b border-border bg-card px-3 py-2.5 sm:px-4">
                  <PortButton
                    variant="ghost"
                    className="h-8 w-8 px-0 md:hidden"
                    onClick={backToList}
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={16} />
                  </PortButton>
                  <UserAvatar name={selected.name} />
                  <div className="min-w-0 flex-1">
                    <h2 className="m-0 truncate text-sm font-semibold text-foreground">
                      {selected.name}
                    </h2>
                    <p className="m-0 truncate text-xs text-muted-foreground">
                      {selected.type === 'group'
                        ? `${selected.memberCount} member${selected.memberCount === 1 ? '' : 's'}${
                            selected.description ? ` · ${selected.description}` : ''
                          }`
                        : 'Direct message'}
                    </p>
                  </div>
                </header>

                <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 sm:px-4">
                  {messagesLoading ? (
                    <p className="text-center text-sm text-muted-foreground">Loading messages…</p>
                  ) : messagesError ? (
                    <div className="mx-auto max-w-md">
                      <ErrorBanner message={messagesError} />
                    </div>
                  ) : messages.length === 0 ? (
                    <EmptyState message="No messages yet. Say hello!" />
                  ) : (
                    <div className="space-y-1">
                      {messages.map((message, index) => {
                        const mine = message.senderId === currentUserId;
                        const previous = messages[index - 1];
                        const newDay =
                          !previous ||
                          new Date(previous.createdAt).toDateString() !==
                            new Date(message.createdAt).toDateString();
                        const showSender =
                          !mine &&
                          selected.type === 'group' &&
                          (!previous || previous.senderId !== message.senderId || newDay);

                        return (
                          <React.Fragment key={message.id}>
                            {newDay && (
                              <div className="flex items-center gap-3 py-2">
                                <span className="h-px flex-1 bg-border" />
                                <span className="text-[11px] font-medium text-muted-foreground">
                                  {dateSeparatorLabel(message.createdAt)}
                                </span>
                                <span className="h-px flex-1 bg-border" />
                              </div>
                            )}
                            <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                              <div className="max-w-[78%] sm:max-w-[68%]">
                                {showSender && (
                                  <p className="mb-0.5 ms-1 text-[11px] font-semibold text-muted-foreground">
                                    {message.senderName}
                                  </p>
                                )}
                                <div
                                  className={cn(
                                    'whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                                    mine
                                      ? 'emis-btn-primary rounded-br-md'
                                      : 'rounded-bl-md bg-muted text-foreground'
                                  )}
                                >
                                  {message.content}
                                </div>
                                <p
                                  className={cn(
                                    'mt-0.5 text-[10px] text-muted-foreground',
                                    mine ? 'text-end pe-1' : 'ps-1'
                                  )}
                                >
                                  {formatTime(message.createdAt)}
                                </p>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>

                <form
                  onSubmit={handleSend}
                  className="flex items-end gap-2 border-t border-border bg-card p-3"
                >
                  <div className="min-w-0 flex-1">
                    <TextAreaField
                      name="message"
                      rows={1}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      maxLength={4000}
                      placeholder={`Message ${selected.name}…`}
                      className="min-h-[44px] max-h-32 resize-none py-2.5"
                      disabled={sending}
                    />
                  </div>
                  <PortButton
                    type="submit"
                    variant="primary"
                    className="h-10 px-3"
                    disabled={sending || !draft.trim()}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Send size={16} /> <span className="hidden sm:inline">Send</span>
                    </span>
                  </PortButton>
                </form>
              </>
            )}
          </section>
        </div>
      </SectionPanel>
    </>
  );
}

export default function MessagingPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">Loading messaging…</div>
      }
    >
      <MessagingWorkspace />
    </Suspense>
  );
}
