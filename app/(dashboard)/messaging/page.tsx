'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Archive,
  ArrowLeft,
  Ban,
  BellOff,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  Lock,
  LogOut,
  MessagesSquare,
  Palette,
  Phone,
  Pin,
  Plus,
  Search,
  Star,
  Users,
  Video,
} from 'lucide-react';
import {
  EmptyState,
  ErrorBanner,
  FormDialog,
  InputField,
  PortButton,
  RowActions,
  SearchBar,
  SectionPanel,
  SegmentedControl,
  TextAreaField,
} from '@/components/ports';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import UserAvatar from '@/components/messaging/UserAvatar';
import ContactInfoPanel from '@/components/messaging/ContactInfoPanel';
import ChatComposer, { type ReplyDraft } from '@/components/messaging/ChatComposer';
import MessageBubble from '@/components/messaging/MessageBubble';
import { createClient } from '@/lib/supabase/client';
import type { ChatMessage, ConversationSummary } from '@/lib/messaging';
import { isDirectMessagingType } from '@/lib/messaging-types';

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
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const aAt = a.lastMessage?.at;
    const bAt = b.lastMessage?.at;
    if (aAt && bAt) return bAt.localeCompare(aAt);
    if (aAt) return -1;
    if (bAt) return 1;
    return a.name.localeCompare(b.name);
  });
}

function draftKey(id: string) {
  return `messaging-draft:${id}`;
}

function formatLastSeen(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return `last seen today at ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `last seen yesterday at ${time}`;
  return `last seen ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${time}`;
}

function lastPreview(item: ConversationSummary) {
  const type = item.lastMessage?.messageType;
  if (type === 'image') return 'Photo';
  if (type === 'video') return 'Video';
  if (type === 'voice') return 'Voice message';
  if (type === 'file') return 'Document';
  return item.lastMessage?.text ?? 'No messages yet';
}

function MessagingWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [listFilter, setListFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<{ id: string; type: 'voice' | 'video'; startedAt: number } | null>(
    null
  );
  const [reply, setReply] = useState<ReplyDraft | null>(null);
  const [editMessage, setEditMessage] = useState<ChatMessage | null>(null);
  const [editText, setEditText] = useState('');
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [forwardQuery, setForwardQuery] = useState('');
  const [infoMessage, setInfoMessage] = useState<ChatMessage | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [people, setPeople] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [matchIndex, setMatchIndex] = useState(0);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [peerOnline, setPeerOnline] = useState(false);
  const [unreadAnchor, setUnreadAnchor] = useState<string | null>(null);
  const [pinnedMessageIds, setPinnedMessageIds] = useState<string[]>([]);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [muteOpen, setMuteOpen] = useState(false);
  const [muteTargetId, setMuteTargetId] = useState<string | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [groupEditOpen, setGroupEditOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [disappearOpen, setDisappearOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [wallpaperOn, setWallpaperOn] = useState(true);
  const [mediaIndex, setMediaIndex] = useState<number | null>(null);

  const requestRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const manualSelectionRef = useRef(false);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const pendingUnreadRef = useRef(0);
  const presenceRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  const writeUrl = useCallback((conversationId: string | null, showInfo: boolean) => {
    const params = new URLSearchParams();
    if (conversationId) params.set('c', conversationId);
    if (showInfo && conversationId) params.set('info', '1');
    const next = params.toString() ? `/messaging?${params}` : '/messaging';
    router.replace(next, { scroll: false });
  }, [router]);

  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/messaging/conversations', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load conversations');
      const list = Array.isArray(data.conversations) ? (data.conversations as ConversationSummary[]) : [];
      setConversations(list);
      if (Array.isArray(data.prefs?.starred)) setStarredIds(data.prefs.starred as string[]);
      if (Array.isArray(data.prefs?.pinnedMessages)) setPinnedMessageIds(data.prefs.pinnedMessages as string[]);
      setCurrentUserId(typeof data.currentUserId === 'string' ? data.currentUserId : null);
      setError(null);
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
      const list = Array.isArray(data.messages) ? (data.messages as ChatMessage[]) : [];
      setMessages(list);
      const unread = pendingUnreadRef.current;
      if (unread > 0 && list.length) {
        setUnreadAnchor(list[Math.max(0, list.length - unread)]?.id ?? null);
      } else {
        setUnreadAnchor(null);
      }
      setMessagesLoading(false);
      const conversation = data.conversation as ConversationSummary | undefined;
      if (Array.isArray(data.prefs?.pinnedMessages)) setPinnedMessageIds(data.prefs.pinnedMessages as string[]);
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

  const markRead = useCallback(async (conversationId: string) => {
    try {
      await fetch(`/api/messaging/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });
      setConversations((prev) =>
        prev.map((item) => (item.id === conversationId ? { ...item, unreadCount: 0 } : item))
      );
    } catch {
      /* read receipts are best-effort */
    }
  }, []);

  useEffect(() => {
    loadConversations();
    const timer = setInterval(() => loadConversations(true), 30000);
    return () => clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    writeUrl(null, false);
  }, [writeUrl]);

  useEffect(() => {
    const fromUrl = searchParams.get('c');
    if (!fromUrl) {
      setSelectedId(null);
      setInfoOpen(false);
      setMessages([]);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setMessagesError(null);
      return;
    }
    loadMessages(selectedId);
    markRead(selectedId);
  }, [selectedId, loadMessages, markRead]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('messaging-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const row = (payload.new || payload.old) as { group_id?: string } | null;
          const groupId = row?.group_id;
          loadConversations(true);
          const current = selectedIdRef.current;
          if (current && groupId === current) {
            loadMessages(current, true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConversations, loadMessages]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node && stickToBottom) node.scrollTop = node.scrollHeight;
  }, [messages, messagesLoading, selectedId, stickToBottom]);

  useEffect(() => {
    if (!selectedId) return;
    try {
      const saved = window.localStorage.getItem(draftKey(selectedId));
      if (saved) setDraft(saved);
    } catch {
      /* ignore */
    }
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    try {
      window.localStorage.setItem(draftKey(selectedId), draft);
    } catch {
      /* ignore */
    }
  }, [draft, selectedId]);

  useEffect(() => {
    if (!selectedId || !currentUserId) return;
    const supabase = createClient();
    const channel = supabase.channel(`chat-presence-${selectedId}`, {
      config: { presence: { key: currentUserId } },
    });
    const sync = () => {
      const state = channel.presenceState() as Record<string, { typing?: boolean; name?: string }[]>;
      const others = Object.entries(state).filter(([id]) => id !== currentUserId);
      setPeerOnline(others.length > 0);
      setTypingNames(
        others.flatMap(([, metas]) => metas.filter((meta) => meta.typing).map((meta) => meta.name || 'Someone'))
      );
    };
    channel.on('presence', { event: 'sync' }, sync);
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ typing: false, name: 'You', online: true });
      }
    });
    presenceRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      presenceRef.current = null;
      setTypingNames([]);
      setPeerOnline(false);
    };
  }, [selectedId, currentUserId]);

  useEffect(() => {
    try {
      setWallpaperOn(window.localStorage.getItem('messaging-wallpaper') !== 'off');
    } catch {
      setWallpaperOn(true);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setLastSeen(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/messaging/conversations/${selectedId}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setLastSeen(typeof data.lastSeen === 'string' ? data.lastSeen : null);
      })
      .catch(() => {
        if (!cancelled) setLastSeen(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (mediaIndex !== null) {
        setMediaIndex(null);
        return;
      }
      if (selectMode) {
        setSelectMode(false);
        setSelectedMessageIds([]);
        return;
      }
      if (chatSearchOpen) {
        setChatSearchOpen(false);
        return;
      }
      if (infoOpen) {
        setInfoOpen(false);
        writeUrl(selectedId, false);
        return;
      }
      if (selectedId && window.matchMedia('(max-width: 767px)').matches) {
        backToList();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chatSearchOpen, infoOpen, mediaIndex, selectMode, selectedId, writeUrl]);

  const selected = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const archivedCount = conversations.filter((item) => item.isArchived).length;
  const unreadTotal = conversations.filter((item) => !item.isArchived && item.unreadCount > 0).length;
  const favoriteTotal = conversations.filter((item) => !item.isArchived && item.isFavorite).length;
  const groupTotal = conversations.filter((item) => !item.isArchived && !isDirectMessagingType(item.type)).length;
  const mediaItems = messages.filter((item) => item.messageType === 'image' && item.fileUrl);
  const pinnedMessage = messages.find((item) => pinnedMessageIds.includes(item.id)) ?? null;

  const visibleConversations = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return conversations.filter((item) => {
      if (showArchived ? !item.isArchived : item.isArchived) return false;
      if (listFilter === 'unread' && !item.unreadCount) return false;
      if (listFilter === 'favorites' && !item.isFavorite) return false;
      if (listFilter === 'groups' && isDirectMessagingType(item.type)) return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        (item.lastMessage?.text ?? '').toLowerCase().includes(needle) ||
        item.members.some((member) => member.name.toLowerCase().includes(needle))
      );
    });
  }, [conversations, query, listFilter, showArchived]);

  const matchIds = useMemo(() => {
    const needle = chatQuery.trim().toLowerCase();
    if (!needle) return [] as string[];
    return messages
      .filter(
        (item) =>
          item.content.toLowerCase().includes(needle) || item.senderName.toLowerCase().includes(needle)
      )
      .map((item) => item.id);
  }, [messages, chatQuery]);

  function selectConversation(id: string) {
    manualSelectionRef.current = false;
    pendingUnreadRef.current = conversations.find((item) => item.id === id)?.unreadCount ?? 0;
    setSelectedId(id);
    setReply(null);
    setChatQuery('');
    setChatSearchOpen(false);
    setSelectMode(false);
    setSelectedMessageIds([]);
    setMediaIndex(null);
    writeUrl(id, infoOpen);
    try {
      setDraft(window.localStorage.getItem(draftKey(id)) || '');
    } catch {
      setDraft('');
    }
  }

  function backToList() {
    manualSelectionRef.current = true;
    setSelectedId(null);
    setMessages([]);
    setInfoOpen(false);
    writeUrl(null, false);
  }

  function openContactInfo() {
    if (!selectedId) return;
    setInfoOpen(true);
    writeUrl(selectedId, true);
  }

  function closeContactInfo() {
    setInfoOpen(false);
    writeUrl(selectedId, false);
  }

  function applyConversation(next: ConversationSummary | null) {
    if (!next) return;
    setConversations((prev) => sortConversations(prev.map((item) => (item.id === next.id ? { ...item, ...next } : item))));
  }

  async function patchChat(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/messaging/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update chat');
    if (Array.isArray(data.prefs?.starred)) setStarredIds(data.prefs.starred as string[]);
    if (Array.isArray(data.prefs?.pinnedMessages)) setPinnedMessageIds(data.prefs.pinnedMessages as string[]);
    if (patch.leave === true || patch.deleteChat === true) {
      setConversations((prev) => prev.filter((item) => item.id !== id));
      if (selectedId === id) {
        manualSelectionRef.current = true;
        setSelectedId(null);
        setMessages([]);
        setInfoOpen(false);
        writeUrl(null, false);
      }
      return;
    }
    applyConversation(data.conversation as ConversationSummary);
  }

  async function patchConversation(patch: Record<string, unknown>) {
    if (!selectedId) return;
    await patchChat(selectedId, patch);
  }

  async function patchMessage(messageId: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/messaging/messages/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update message');
    const message = data.message as ChatMessage;
    setMessages((prev) => prev.map((item) => (item.id === message.id ? message : item)));
    return message;
  }

  function jumpToMessage(id: string) {
    setHighlightId(id);
    const node = document.getElementById(`msg-${id}`);
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => setHighlightId(null), 1600);
  }

  async function appendMessage(message: ChatMessage) {
    if (selectedIdRef.current !== selectedId || !selectedId) return;
    setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]));
    setConversations((prev) =>
      sortConversations(
        prev.map((item) =>
          item.id === selectedId
            ? {
                ...item,
                lastMessage: {
                  text: message.content,
                  at: message.createdAt,
                  senderId: message.senderId,
                  messageType: message.messageType,
                },
                unreadCount: 0,
              }
            : item
        )
      )
    );
  }

  async function sendText() {
    if (!selectedId || sending || selected?.isBlocked) return;
    const content = draft.trim();
    if (!content) return;
    setSending(true);
    try {
      const res = await fetch('/api/messaging/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedId,
          content,
          replyTo: reply?.id,
          replyName: reply?.name,
          replyText: reply?.text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');
      await appendMessage(data.message as ChatMessage);
      setDraft('');
      setReply(null);
      setStickToBottom(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  async function sendPoll() {
    if (!selectedId || sending || selected?.isBlocked) return;
    const question = pollQuestion.trim();
    const options = pollOptions.map((item) => item.trim()).filter(Boolean);
    if (!question || options.length < 2) {
      toast.error('Add a question and at least two options');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/messaging/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedId,
          content: question,
          poll: { question, options },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send poll');
      await appendMessage(data.message as ChatMessage);
      setPollOpen(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setStickToBottom(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send poll');
    } finally {
      setSending(false);
    }
  }

  function exportChat() {
    if (!selected) return;
    const lines = messages.map((message) => {
      const stamp = new Date(message.createdAt).toLocaleString();
      const body = message.poll?.question || message.content || message.fileName || '';
      return `[${stamp}] ${message.senderName}: ${body}`;
    });
    const blob = new Blob([`Chat with ${selected.name}\n\n${lines.join('\n')}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selected.name.replace(/\s+/g, '-')}-chat.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Chat exported');
  }

  function downloadMessage(message: ChatMessage) {
    if (!message.fileUrl) return;
    const link = document.createElement('a');
    link.href = message.fileUrl;
    link.download = message.fileName || 'download';
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.click();
  }

  function toggleWallpaper() {
    setWallpaperOn((on) => {
      const next = !on;
      try {
        window.localStorage.setItem('messaging-wallpaper', next ? 'on' : 'off');
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function sendFile(file: File, kind: 'image' | 'file' | 'voice') {
    if (!selectedId || sending || selected?.isBlocked) return;
    setSending(true);
    try {
      const form = new FormData();
      form.set('conversationId', selectedId);
      form.set('file', file);
      form.set(
        'messageType',
        kind === 'voice' ? 'voice' : kind === 'image' ? (file.type.startsWith('video/') ? 'video' : 'image') : 'file'
      );
      if (draft.trim()) form.set('content', draft.trim());
      if (reply) {
        form.set('replyTo', reply.id);
        form.set('replyName', reply.name);
        form.set('replyText', reply.text);
      }
      const res = await fetch('/api/messaging/messages', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send attachment');
      await appendMessage(data.message as ChatMessage);
      setDraft('');
      setReply(null);
      setStickToBottom(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send attachment');
    } finally {
      setSending(false);
    }
  }

  async function startCall(type: 'voice' | 'video') {
    if (!selectedId) return;
    setCallOpen(false);
    try {
      const res = await fetch('/api/messaging/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedId, callType: type, action: 'start' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start call');
      setActiveCall({ id: String(data.call.id), type, startedAt: Date.now() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start call');
    }
  }

  async function endCall() {
    if (!selectedId || !activeCall) return;
    try {
      const res = await fetch('/api/messaging/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedId, callId: activeCall.id, action: 'end' }),
      });
      const data = await res.json();
      if (data.message) await appendMessage(data.message as ChatMessage);
    } catch {
      toast.error('Could not end the call');
    } finally {
      setActiveCall(null);
    }
  }

  return (
    <SectionPanel bodyClassName="flex h-full min-h-0 flex-col p-0" className="h-full rounded-none border-0 shadow-none">
      {error && (
        <div className="px-3 pt-3">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            'w-full flex-col border-border bg-card md:flex md:w-[360px] md:shrink-0 md:border-e',
            selectedId || infoOpen ? 'hidden md:flex' : 'flex'
          )}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <h1 className="m-0 text-[22px] font-bold tracking-tight text-foreground">Chats</h1>
            <PortButton
              variant="primary"
              className="h-9 w-9 rounded-full px-0"
              onClick={() => router.push('/messaging/new')}
              aria-label="New conversation"
            >
              <Plus size={18} />
            </PortButton>
          </div>
          <div className="space-y-2 px-3 pb-3">
            <SearchBar value={query} onChange={setQuery} placeholder="Search or start a new chat" />
            <SegmentedControl
              value={listFilter}
              onChange={setListFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'unread', label: unreadTotal ? `Unread ${unreadTotal}` : 'Unread' },
                { value: 'favorites', label: favoriteTotal ? `Favorites ${favoriteTotal}` : 'Favorites' },
                { value: 'groups', label: groupTotal ? `Groups ${groupTotal}` : 'Groups' },
              ]}
              className="w-full"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowArchived((open) => !open)}
            className="flex items-center gap-3 px-4 py-2.5 text-start text-sm hover:bg-muted/60"
          >
            <Archive size={16} className="text-muted-foreground" />
            <span className="flex-1 font-medium">Archived</span>
            {archivedCount > 0 && <span className="text-xs text-muted-foreground">{archivedCount}</span>}
          </button>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading conversations…</p>
            ) : visibleConversations.length === 0 ? (
              <EmptyState
                message={
                  showArchived
                    ? 'No archived chats.'
                    : query
                      ? 'No conversations match your search.'
                      : 'No conversations yet.'
                }
              >
                <PortButton variant="ghost" className="mt-2 h-8" onClick={() => router.push('/messaging/new')}>
                  Start one
                </PortButton>
              </EmptyState>
            ) : (
              <ul className="m-0 list-none p-0">
                {visibleConversations.map((item) => {
                  const active = item.id === selectedId;
                  const fromMe = item.lastMessage?.senderId === currentUserId;
                  return (
                    <li key={item.id} className={cn('group flex items-center', active ? 'bg-muted' : 'hover:bg-muted/60')}>
                      <button
                        type="button"
                        onClick={() => selectConversation(item.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-start transition-colors"
                      >
                        <UserAvatar name={item.name} src={item.avatarUrl} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">{item.name}</span>
                            <span
                              className={cn(
                                'shrink-0 text-[11px]',
                                item.unreadCount ? 'font-semibold text-primary' : 'text-muted-foreground'
                              )}
                            >
                              {formatListTime(item.lastMessage?.at)}
                            </span>
                          </span>
                          <span className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
                            {fromMe && <Check size={12} className="shrink-0" />}
                            {!isDirectMessagingType(item.type) && <Users size={12} className="shrink-0" />}
                            {item.isMuted && <BellOff size={12} className="shrink-0" />}
                            {item.isPinned && <Pin size={12} className="shrink-0" />}
                            {item.isFavorite && <Star size={12} className="shrink-0" />}
                            {item.isBlocked && <Ban size={12} className="shrink-0" />}
                            <span className="min-w-0 flex-1 truncate">{lastPreview(item)}</span>
                            {item.unreadCount > 0 && (
                              <span className="ms-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#88b6ff] px-1.5 text-[11px] font-bold text-[#142033]">
                                {item.unreadCount}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                      <div className="pe-2 opacity-0 group-hover:opacity-100">
                        <RowActions
                          maxInline={0}
                          items={[
                            {
                              key: 'pin',
                              label: item.isPinned ? 'Unpin' : 'Pin',
                              icon: <Pin size={14} />,
                              onClick: () =>
                                patchChat(item.id, { pinned: !item.isPinned }).catch((err) =>
                                  toast.error(err instanceof Error ? err.message : 'Update failed')
                                ),
                            },
                            {
                              key: 'mute',
                              label: item.isMuted ? 'Unmute' : 'Mute',
                              icon: <BellOff size={14} />,
                              onClick: () => {
                                if (item.isMuted) {
                                  patchChat(item.id, { muteHours: null }).catch((err) =>
                                    toast.error(err instanceof Error ? err.message : 'Update failed')
                                  );
                                  return;
                                }
                                setMuteTargetId(item.id);
                                setMuteOpen(true);
                              },
                            },
                            {
                              key: 'unread',
                              label: 'Mark as unread',
                              icon: <Check size={14} />,
                              onClick: () =>
                                patchChat(item.id, { unread: true }).catch((err) =>
                                  toast.error(err instanceof Error ? err.message : 'Update failed')
                                ),
                            },
                            {
                              key: 'archive',
                              label: item.isArchived ? 'Unarchive' : 'Archive',
                              icon: <Archive size={14} />,
                              onClick: () =>
                                patchChat(item.id, { archived: !item.isArchived }).catch((err) =>
                                  toast.error(err instanceof Error ? err.message : 'Update failed')
                                ),
                            },
                            {
                              key: 'favorite',
                              label: item.isFavorite ? 'Remove favorite' : 'Favorite',
                              icon: <Star size={14} />,
                              onClick: () =>
                                patchChat(item.id, { favorite: !item.isFavorite }).catch((err) =>
                                  toast.error(err instanceof Error ? err.message : 'Update failed')
                                ),
                            },
                          ]}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section
          className={cn(
            'h-full min-h-0 min-w-0 flex-1 flex-col md:flex',
            selectedId && !infoOpen ? 'flex' : 'hidden',
            selectedId && infoOpen ? 'md:flex' : ''
          )}
        >
          {!selected ? (
            <EmptyState message="Select a conversation to start chatting." className="m-auto py-16">
              <MessagesSquare size={28} className="mx-auto mb-2 text-muted-foreground" />
              <PortButton variant="secondary" className="mt-2" onClick={() => router.push('/messaging/new')}>
                New conversation
              </PortButton>
            </EmptyState>
          ) : (
            <>
              <header className="flex h-16 shrink-0 items-center gap-1 border-b border-border bg-card px-2 sm:px-3">
                <PortButton
                  variant="ghost"
                  className="h-9 w-9 px-0"
                  onClick={backToList}
                  aria-label="Back to conversations"
                >
                  <ArrowLeft size={16} />
                </PortButton>
                <button
                  type="button"
                  onClick={openContactInfo}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-start hover:bg-muted/70"
                >
                  <UserAvatar name={selected.name} src={selected.avatarUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="m-0 block truncate text-sm font-semibold text-foreground">{selected.name}</span>
                    <span className="m-0 block truncate text-xs text-muted-foreground">
                      {typingNames.length
                        ? `${typingNames[0]} is typing…`
                        : isDirectMessagingType(selected.type)
                          ? peerOnline
                            ? 'online'
                            : formatLastSeen(lastSeen) || (selected.isMuted ? 'Muted' : 'Click for contact info')
                          : `${selected.memberCount} member${selected.memberCount === 1 ? '' : 's'}${
                              peerOnline ? ' · online' : ''
                            }`}
                    </span>
                  </span>
                </button>
                <PortButton variant="ghost" className="h-9 w-9 px-0" aria-label="Video call" onClick={() => setCallOpen(true)}>
                  <Video size={16} />
                </PortButton>
                <PortButton
                  variant="ghost"
                  className="h-9 w-9 px-0"
                  aria-label="Voice call"
                  onClick={() => startCall('voice')}
                >
                  <Phone size={16} />
                </PortButton>
                <PortButton
                  variant="ghost"
                  className="h-9 w-9 px-0"
                  aria-label="Search in conversation"
                  onClick={() => setChatSearchOpen((open) => !open)}
                >
                  <Search size={16} />
                </PortButton>
                <RowActions
                  maxInline={0}
                  items={[
                    { key: 'info', label: 'Contact info', icon: <Users size={16} />, onClick: openContactInfo },
                    {
                      key: 'pin',
                      label: selected.isPinned ? 'Unpin' : 'Pin chat',
                      icon: <Pin size={16} />,
                      onClick: () => patchConversation({ pinned: !selected.isPinned }),
                    },
                    {
                      key: 'favorite',
                      label: selected.isFavorite ? 'Remove favorite' : 'Favorite',
                      icon: <Star size={16} />,
                      onClick: () => patchConversation({ favorite: !selected.isFavorite }),
                    },
                    {
                      key: 'mute',
                      label: selected.isMuted ? 'Unmute' : 'Mute',
                      icon: <BellOff size={16} />,
                      onClick: () => {
                        if (selected.isMuted) {
                          void patchConversation({ muteHours: null });
                          return;
                        }
                        setMuteTargetId(selected.id);
                        setMuteOpen(true);
                      },
                    },
                    {
                      key: 'select',
                      label: selectMode ? 'Cancel select' : 'Select messages',
                      icon: <CheckSquare size={16} />,
                      onClick: () => {
                        setSelectMode((open) => !open);
                        setSelectedMessageIds([]);
                      },
                    },
                    {
                      key: 'wallpaper',
                      label: wallpaperOn ? 'Hide wallpaper' : 'Show wallpaper',
                      icon: <Palette size={16} />,
                      onClick: toggleWallpaper,
                    },
                    {
                      key: 'export',
                      label: 'Export chat',
                      icon: <Download size={16} />,
                      onClick: exportChat,
                    },
                    {
                      key: 'disappear',
                      label: 'Disappearing messages',
                      icon: <Clock size={16} />,
                      onClick: () => setDisappearOpen(true),
                    },
                    isDirectMessagingType(selected.type)
                      ? {
                          key: 'block',
                          label: selected.isBlocked ? 'Unblock' : 'Block',
                          icon: <Ban size={16} />,
                          onClick: () => setBlockOpen(true),
                        }
                      : {
                          key: 'leave',
                          label: 'Leave group',
                          icon: <LogOut size={16} />,
                          onClick: () => setLeaveOpen(true),
                        },
                    {
                      key: 'unread',
                      label: 'Mark as unread',
                      icon: <Check size={16} />,
                      onClick: () => patchConversation({ unread: true }),
                    },
                    {
                      key: 'archive',
                      label: selected.isArchived ? 'Unarchive' : 'Archive',
                      icon: <Archive size={16} />,
                      onClick: () => patchConversation({ archived: !selected.isArchived }),
                    },
                    {
                      key: 'clear',
                      label: 'Clear chat',
                      icon: <Archive size={16} />,
                      onClick: () => setClearOpen(true),
                    },
                    {
                      key: 'close',
                      label: 'Close chat',
                      icon: <ArrowLeft size={16} />,
                      onClick: backToList,
                    },
                  ]}
                />
              </header>

              {chatSearchOpen && (
                <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
                  <SearchBar
                    value={chatQuery}
                    onChange={(value) => {
                      setChatQuery(value);
                      setMatchIndex(0);
                    }}
                    placeholder="Search in this chat"
                  />
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {matchIds.length ? `${matchIndex + 1}/${matchIds.length}` : '0'}
                  </span>
                  <PortButton
                    variant="ghost"
                    className="h-8 w-8 px-0"
                    disabled={!matchIds.length}
                    onClick={() => {
                      const next = (matchIndex - 1 + matchIds.length) % matchIds.length;
                      setMatchIndex(next);
                      jumpToMessage(matchIds[next]);
                    }}
                  >
                    <ChevronUp size={16} />
                  </PortButton>
                  <PortButton
                    variant="ghost"
                    className="h-8 w-8 px-0"
                    disabled={!matchIds.length}
                    onClick={() => {
                      const next = (matchIndex + 1) % matchIds.length;
                      setMatchIndex(next);
                      jumpToMessage(matchIds[next]);
                    }}
                  >
                    <ChevronDown size={16} />
                  </PortButton>
                </div>
              )}

              <div
                ref={scrollRef}
                onScroll={(event) => {
                  const node = event.currentTarget;
                  setStickToBottom(node.scrollHeight - node.scrollTop - node.clientHeight < 96);
                }}
                className={cn(
                  'relative min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6',
                  wallpaperOn ? 'messaging-wallpaper' : 'bg-muted/40'
                )}
              >
                {activeCall && (
                  <div className="sticky top-0 z-10 mb-3 flex items-center justify-between rounded-xl border border-border bg-card/95 px-3 py-2 shadow-sm">
                    <p className="m-0 text-sm font-semibold">
                      {activeCall.type === 'video' ? 'Video call' : 'Voice call'} in progress
                    </p>
                    <PortButton variant="danger" className="h-8" onClick={endCall}>
                      End
                    </PortButton>
                  </div>
                )}
                <div className="mb-3 flex justify-center">
                  <span className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-[11px] text-muted-foreground shadow-sm">
                    <Lock size={11} />
                    Messages are end-to-end encrypted
                    {selected.disappearingHours ? ` · disappear after ${selected.disappearingHours}h` : ''}
                  </span>
                </div>
                {pinnedMessage && (
                  <button
                    type="button"
                    className="sticky top-0 z-10 mb-3 flex w-full items-center gap-2 rounded-xl border border-border bg-card/95 px-3 py-2 text-start text-sm shadow-sm"
                    onClick={() => jumpToMessage(pinnedMessage.id)}
                  >
                    <Pin size={14} />
                    <span className="min-w-0 flex-1 truncate">
                      {pinnedMessage.poll?.question || pinnedMessage.content || pinnedMessage.fileName}
                    </span>
                  </button>
                )}
                {selectMode && (
                  <div className="sticky top-0 z-10 mb-3 flex items-center gap-2 rounded-xl border border-border bg-card/95 px-3 py-2 shadow-sm">
                    <p className="m-0 flex-1 text-sm font-semibold">{selectedMessageIds.length} selected</p>
                    <PortButton
                      variant="ghost"
                      className="h-8"
                      disabled={!selectedMessageIds.length}
                      onClick={() => {
                        const first = messages.find((item) => selectedMessageIds.includes(item.id));
                        if (first) setForwardMessage(first);
                      }}
                    >
                      Forward
                    </PortButton>
                    <PortButton
                      variant="ghost"
                      className="h-8"
                      disabled={!selectedMessageIds.length}
                      onClick={async () => {
                        await Promise.all(
                          selectedMessageIds.map((id) => patchConversation({ hideMessageId: id, hidden: true }))
                        );
                        setMessages((prev) => prev.filter((item) => !selectedMessageIds.includes(item.id)));
                        setSelectedMessageIds([]);
                        setSelectMode(false);
                      }}
                    >
                      Delete for me
                    </PortButton>
                    <PortButton
                      variant="ghost"
                      className="h-8"
                      onClick={() => {
                        setSelectMode(false);
                        setSelectedMessageIds([]);
                      }}
                    >
                      Cancel
                    </PortButton>
                  </div>
                )}
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
                        !isDirectMessagingType(selected.type) &&
                        (!previous || previous.senderId !== message.senderId || newDay);

                      return (
                        <React.Fragment key={message.id}>
                          {unreadAnchor && message.id === unreadAnchor && (
                            <div className="flex justify-center py-2">
                              <span className="rounded-full bg-card px-3 py-1 text-[11px] font-semibold text-primary shadow-sm">
                                Unread messages
                              </span>
                            </div>
                          )}
                          {newDay && (
                            <div className="flex justify-center py-3">
                              <span className="rounded-full bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
                                {dateSeparatorLabel(message.createdAt)}
                              </span>
                            </div>
                          )}
                          <div id={`msg-${message.id}`} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                            <MessageBubble
                              message={message}
                              mine={mine}
                              showSender={showSender}
                              starred={starredIds.includes(message.id)}
                              memberCount={selected.memberCount}
                              currentUserId={currentUserId}
                              highlight={highlightId === message.id || matchIds[matchIndex] === message.id}
                              onStar={() =>
                                patchConversation({
                                  starredId: message.id,
                                  starred: !starredIds.includes(message.id),
                                })
                              }
                              onReply={() =>
                                setReply({
                                  id: message.id,
                                  name: message.senderName,
                                  text: message.content.slice(0, 80),
                                })
                              }
                              onCopy={() => {
                                void navigator.clipboard.writeText(message.content);
                                toast.success('Copied');
                              }}
                              onDelete={() =>
                                patchMessage(message.id, { deleted: true }).catch((err) =>
                                  toast.error(err instanceof Error ? err.message : 'Delete failed')
                                )
                              }
                              onEdit={() => {
                                setEditMessage(message);
                                setEditText(message.content);
                              }}
                              onForward={() => {
                                setForwardMessage(message);
                                setForwardQuery('');
                              }}
                              onInfo={() => setInfoMessage(message)}
                              onReact={(emoji) =>
                                patchMessage(message.id, { reaction: emoji }).catch((err) =>
                                  toast.error(err instanceof Error ? err.message : 'Reaction failed')
                                )
                              }
                              onJumpReply={jumpToMessage}
                              pinned={pinnedMessageIds.includes(message.id)}
                              selectMode={selectMode}
                              selected={selectedMessageIds.includes(message.id)}
                              onSelect={() =>
                                setSelectedMessageIds((prev) =>
                                  prev.includes(message.id)
                                    ? prev.filter((id) => id !== message.id)
                                    : [...prev, message.id]
                                )
                              }
                              onPin={() =>
                                patchConversation({
                                  pinMessageId: message.id,
                                  pinnedMessage: !pinnedMessageIds.includes(message.id),
                                }).catch((err) => toast.error(err instanceof Error ? err.message : 'Pin failed'))
                              }
                              onDownload={() => downloadMessage(message)}
                              onDeleteForMe={() =>
                                patchConversation({ hideMessageId: message.id, hidden: true })
                                  .then(() => setMessages((prev) => prev.filter((item) => item.id !== message.id)))
                                  .catch((err) => toast.error(err instanceof Error ? err.message : 'Delete failed'))
                              }
                              onPollVote={(index) =>
                                patchMessage(message.id, { pollVote: index }).catch((err) =>
                                  toast.error(err instanceof Error ? err.message : 'Vote failed')
                                )
                              }
                              onOpenMedia={() => {
                                const index = mediaItems.findIndex((item) => item.id === message.id);
                                setMediaIndex(index >= 0 ? index : 0);
                              }}
                            />
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
                {!stickToBottom && (
                  <div className="sticky bottom-3 flex justify-end">
                    <PortButton
                      variant="secondary"
                      className="h-9 w-9 rounded-full px-0"
                      onClick={() => {
                        setStickToBottom(true);
                        const node = scrollRef.current;
                        if (node) node.scrollTop = node.scrollHeight;
                      }}
                      aria-label="Scroll to latest message"
                    >
                      <ChevronDown size={16} />
                    </PortButton>
                  </div>
                )}
              </div>

              <ChatComposer
                name={selected.name}
                value={draft}
                sending={sending}
                blocked={selected.isBlocked}
                reply={reply}
                mentionMembers={selected.members.map((member) => ({ id: member.id, name: member.name }))}
                onChange={setDraft}
                onSend={sendText}
                onAttach={(file, kind) => sendFile(file, kind)}
                onVoice={(file) => sendFile(file, 'voice')}
                onPoll={() => setPollOpen(true)}
                onUnblock={() => setBlockOpen(true)}
                onCancelReply={() => setReply(null)}
                onTyping={(typing) => {
                  void presenceRef.current?.track({
                    typing,
                    name: selected.members.find((member) => member.id === currentUserId)?.name || 'You',
                    online: true,
                  });
                }}
              />
            </>
          )}
        </section>

        {selectedId && infoOpen && (
          <div className="flex h-full min-h-0 w-full shrink-0 md:w-[380px]">
            <ContactInfoPanel
              conversationId={selectedId}
              fallback={selected}
              messages={messages}
              starredIds={starredIds}
              onClose={closeContactInfo}
              lastSeen={lastSeen}
              onFavorite={() => selected && patchConversation({ favorite: !selected.isFavorite })}
              onMute={() => {
                if (!selected) return;
                if (selected.isMuted) {
                  void patchConversation({ muteHours: null });
                  return;
                }
                setMuteTargetId(selected.id);
                setMuteOpen(true);
              }}
              onArchive={() => selected && patchConversation({ archived: !selected.isArchived })}
              onBlock={() => setBlockOpen(true)}
              onLeave={() => setLeaveOpen(true)}
              onExport={exportChat}
              onEditGroup={() => {
                setGroupName(selected?.name || '');
                setGroupDescription(selected?.description || '');
                setGroupEditOpen(true);
              }}
              onDisappear={() => setDisappearOpen(true)}
              onRemoveMember={(id) =>
                patchConversation({ removeMemberId: id })
                  .then(() => toast.success('Member removed'))
                  .catch((err) => toast.error(err instanceof Error ? err.message : 'Remove failed'))
              }
              onStarredJump={(id) => {
                closeContactInfo();
                jumpToMessage(id);
              }}
              onAddMembers={
                selected && !isDirectMessagingType(selected.type)
                  ? async () => {
                      setAddOpen(true);
                      if (!people.length) {
                        const res = await fetch('/api/users', { cache: 'no-store' });
                        const data = await res.json();
                        setPeople(Array.isArray(data) ? data : data.users || []);
                      }
                    }
                  : undefined
              }
            />
          </div>
        )}
      </div>

      <FormDialog open={Boolean(editMessage)} title="Edit message" onClose={() => setEditMessage(null)}>
        <InputField value={editText} onChange={(event) => setEditText(event.target.value)} />
        <div className="mt-3 flex justify-end gap-2">
          <PortButton variant="ghost" onClick={() => setEditMessage(null)}>
            Cancel
          </PortButton>
          <PortButton
            variant="primary"
            onClick={async () => {
              if (!editMessage) return;
              try {
                await patchMessage(editMessage.id, { content: editText });
                setEditMessage(null);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Edit failed');
              }
            }}
          >
            Save
          </PortButton>
        </div>
      </FormDialog>

      <FormDialog open={Boolean(forwardMessage)} title="Forward to…" onClose={() => setForwardMessage(null)}>
        <SearchBar value={forwardQuery} onChange={setForwardQuery} placeholder="Search chats" />
        <ul className="mt-3 m-0 max-h-72 list-none space-y-1 overflow-y-auto p-0">
          {conversations
            .filter((item) => item.id !== selectedId && item.name.toLowerCase().includes(forwardQuery.toLowerCase()))
            .map((item) => (
              <li key={item.id}>
                <PortButton
                  variant="ghost"
                  className="h-auto w-full justify-start py-2"
                  onClick={async () => {
                    if (!forwardMessage) return;
                    try {
                      const res = await fetch('/api/messaging/messages', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          conversationId: item.id,
                          content: forwardMessage.content,
                          messageType: forwardMessage.messageType,
                          fileUrl: forwardMessage.fileUrl,
                          fileName: forwardMessage.fileName,
                          fileSize: forwardMessage.fileSize,
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Forward failed');
                      toast.success(`Forwarded to ${item.name}`);
                      setForwardMessage(null);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Forward failed');
                    }
                  }}
                >
                  <UserAvatar name={item.name} src={item.avatarUrl} size="sm" />
                  {item.name}
                </PortButton>
              </li>
            ))}
        </ul>
      </FormDialog>

      <FormDialog open={Boolean(infoMessage)} title="Message info" onClose={() => setInfoMessage(null)}>
        {infoMessage && (
          <div className="space-y-2 text-sm">
            <p className="m-0">From {infoMessage.senderName}</p>
            <p className="m-0 text-muted-foreground">{new Date(infoMessage.createdAt).toLocaleString()}</p>
            <p className="m-0 font-semibold">Read by</p>
            <ul className="m-0 list-none p-0">
              {(infoMessage.readBy.length
                ? infoMessage.readBy.map((id) => selected?.members.find((member) => member.id === id)?.name || id)
                : ['No one yet']
              ).map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        )}
      </FormDialog>

      <FormDialog open={clearOpen} title="Clear this chat?" onClose={() => setClearOpen(false)}>
        <p className="m-0 text-sm text-muted-foreground">This removes messages in this conversation for everyone.</p>
        <div className="mt-4 flex justify-end gap-2">
          <PortButton variant="ghost" onClick={() => setClearOpen(false)}>
            Cancel
          </PortButton>
          <PortButton
            variant="danger"
            onClick={async () => {
              await patchConversation({ clear: true });
              setMessages((prev) => prev.map((item) => ({ ...item, isDeleted: true })));
              setClearOpen(false);
            }}
          >
            Clear chat
          </PortButton>
        </div>
      </FormDialog>

      <FormDialog open={addOpen} title="Add members" onClose={() => setAddOpen(false)}>
        <SearchBar value={peopleQuery} onChange={setPeopleQuery} placeholder="Search by username" />
        <ul className="mt-3 m-0 max-h-72 list-none space-y-1 overflow-y-auto p-0">
          {people
            .filter((person) => {
              const name = (person.full_name || person.email || '').toLowerCase();
              if (selected?.members.some((member) => member.id === person.id)) return false;
              return name.includes(peopleQuery.toLowerCase());
            })
            .map((person) => (
              <li key={person.id}>
                <PortButton
                  variant="ghost"
                  className="h-auto w-full justify-start py-2"
                  onClick={async () => {
                    await patchConversation({ addMemberIds: [person.id] });
                    toast.success(`Added ${person.full_name || person.email}`);
                    setAddOpen(false);
                  }}
                >
                  {person.full_name || person.email}
                </PortButton>
              </li>
            ))}
        </ul>
      </FormDialog>

      <FormDialog open={callOpen} title="Start a call" onClose={() => setCallOpen(false)}>
        <p className="m-0 mb-4 text-sm text-muted-foreground">
          Choose a call type. This logs the call in the conversation; live camera streaming depends on device permissions.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <PortButton variant="secondary" onClick={() => startCall('voice')}>
            <Phone size={16} /> Voice call
          </PortButton>
          <PortButton variant="primary" onClick={() => startCall('video')}>
            <Video size={16} /> Video call
          </PortButton>
        </div>
      </FormDialog>

      <FormDialog
        open={muteOpen}
        title="Mute notifications"
        onClose={() => {
          setMuteOpen(false);
          setMuteTargetId(null);
        }}
      >
        <p className="m-0 mb-3 text-sm text-muted-foreground">Choose how long to mute this chat.</p>
        <div className="grid gap-2">
          {[
            { hours: 8, label: '8 hours' },
            { hours: 168, label: '1 week' },
            { hours: 0, label: 'Always' },
          ].map((option) => (
            <PortButton
              key={option.label}
              variant="secondary"
              onClick={async () => {
                const id = muteTargetId || selectedId;
                if (!id) return;
                try {
                  await patchChat(id, { muteHours: option.hours });
                  setMuteOpen(false);
                  setMuteTargetId(null);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Mute failed');
                }
              }}
            >
              {option.label}
            </PortButton>
          ))}
        </div>
      </FormDialog>

      <FormDialog open={blockOpen} title={selected?.isBlocked ? 'Unblock this contact?' : 'Block this contact?'} onClose={() => setBlockOpen(false)}>
        <p className="m-0 text-sm text-muted-foreground">
          {selected?.isBlocked
            ? 'They will be able to message you again.'
            : 'They will not be able to send you messages until you unblock them.'}
        </p>
        <div className="mt-3 flex justify-end gap-2">
          <PortButton variant="ghost" onClick={() => setBlockOpen(false)}>
            Cancel
          </PortButton>
          <PortButton
            variant="danger"
            onClick={async () => {
              try {
                await patchConversation({ blocked: !selected?.isBlocked });
                setBlockOpen(false);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Update failed');
              }
            }}
          >
            {selected?.isBlocked ? 'Unblock' : 'Block'}
          </PortButton>
        </div>
      </FormDialog>

      <FormDialog open={leaveOpen} title="Leave this group?" onClose={() => setLeaveOpen(false)}>
        <p className="m-0 text-sm text-muted-foreground">You will no longer receive messages from this group.</p>
        <div className="mt-4 flex justify-end gap-2">
          <PortButton variant="ghost" onClick={() => setLeaveOpen(false)}>
            Cancel
          </PortButton>
          <PortButton
            variant="danger"
            onClick={async () => {
              try {
                await patchConversation({ leave: true });
                setLeaveOpen(false);
                toast.success('You left the group');
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Leave failed');
              }
            }}
          >
            Leave group
          </PortButton>
        </div>
      </FormDialog>

      <FormDialog open={groupEditOpen} title="Group info" onClose={() => setGroupEditOpen(false)}>
        <InputField name="groupName" label="Group name" value={groupName} onChange={(event) => setGroupName(event.target.value)} />
        <div className="mt-3">
          <TextAreaField
            name="groupDescription"
            label="Description"
            value={groupDescription}
            onChange={(event) => setGroupDescription(event.target.value)}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <PortButton variant="ghost" onClick={() => setGroupEditOpen(false)}>
            Cancel
          </PortButton>
          <PortButton
            variant="primary"
            onClick={async () => {
              try {
                await patchConversation({ name: groupName, description: groupDescription });
                setGroupEditOpen(false);
                toast.success('Group updated');
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Update failed');
              }
            }}
          >
            Save
          </PortButton>
        </div>
      </FormDialog>

      <FormDialog open={disappearOpen} title="Disappearing messages" onClose={() => setDisappearOpen(false)}>
        <p className="m-0 mb-3 text-sm text-muted-foreground">New messages will disappear after the selected duration.</p>
        <div className="grid gap-2">
          {[
            { value: 'off', label: 'Off' },
            { value: '24h', label: '24 hours' },
            { value: '7d', label: '7 days' },
            { value: '90d', label: '90 days' },
          ].map((option) => (
            <PortButton
              key={option.value}
              variant="secondary"
              onClick={async () => {
                try {
                  await patchConversation({ disappearing: option.value });
                  setDisappearOpen(false);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Update failed');
                }
              }}
            >
              {option.label}
            </PortButton>
          ))}
        </div>
      </FormDialog>

      <FormDialog
        open={pollOpen}
        title="Create poll"
        onClose={() => {
          setPollOpen(false);
          setPollQuestion('');
          setPollOptions(['', '']);
        }}
      >
        <InputField
          name="pollQuestion"
          label="Question"
          value={pollQuestion}
          onChange={(event) => setPollQuestion(event.target.value)}
        />
        <div className="mt-3 space-y-2">
          {pollOptions.map((option, index) => (
            <InputField
              key={`poll-opt-${index}`}
              name={`poll-opt-${index}`}
              label={`Option ${index + 1}`}
              value={option}
              onChange={(event) =>
                setPollOptions((prev) => prev.map((item, i) => (i === index ? event.target.value : item)))
              }
            />
          ))}
        </div>
        {pollOptions.length < 6 && (
          <PortButton variant="ghost" className="mt-2 h-8" onClick={() => setPollOptions((prev) => [...prev, ''])}>
            Add option
          </PortButton>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <PortButton variant="ghost" onClick={() => setPollOpen(false)}>
            Cancel
          </PortButton>
          <PortButton variant="primary" onClick={sendPoll} disabled={sending}>
            Send poll
          </PortButton>
        </div>
      </FormDialog>

      <FormDialog
        open={mediaIndex !== null && Boolean(mediaItems[mediaIndex ?? 0])}
        title={mediaItems[mediaIndex ?? 0]?.fileName || 'Photo'}
        onClose={() => setMediaIndex(null)}
      >
        {mediaIndex !== null && mediaItems[mediaIndex] && (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaItems[mediaIndex].fileUrl || ''}
              alt={mediaItems[mediaIndex].fileName || 'Photo'}
              className="max-h-[70vh] w-full object-contain"
            />
            <div className="mt-3 flex items-center justify-between">
              <PortButton
                variant="ghost"
                className="h-9 w-9 px-0"
                disabled={mediaIndex <= 0}
                onClick={() => setMediaIndex((value) => Math.max(0, (value ?? 0) - 1))}
                aria-label="Previous photo"
              >
                <ChevronLeft size={16} />
              </PortButton>
              <span className="text-xs text-muted-foreground">
                {mediaIndex + 1} / {mediaItems.length}
              </span>
              <PortButton
                variant="ghost"
                className="h-9 w-9 px-0"
                disabled={mediaIndex >= mediaItems.length - 1}
                onClick={() => setMediaIndex((value) => Math.min(mediaItems.length - 1, (value ?? 0) + 1))}
                aria-label="Next photo"
              >
                <ChevronRight size={16} />
              </PortButton>
            </div>
          </div>
        )}
      </FormDialog>
    </SectionPanel>
  );
}

export default function MessagingPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading messaging…</div>}>
        <MessagingWorkspace />
      </Suspense>
    </div>
  );
}
