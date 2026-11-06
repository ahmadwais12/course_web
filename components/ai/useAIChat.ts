'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AIMessageMetadata } from '@/lib/ai/types';
import type { Language } from '@/lib/i18n';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response_metadata: AIMessageMetadata | null;
  feedback: number | null;
  created_at: string;
  local?: boolean;
};

export type AIStatus = {
  available: boolean;
  reason: string | null;
  message: string | null;
  organization?: string | null;
  scope?: string;
  allowedModules?: string[];
  suggestions: string[];
  canManageOrganization?: boolean;
  isPlatformAdmin?: boolean;
  usage?: {
    daily: number;
    monthly: number;
    dailyLimit: number | null;
    monthlyLimit: number | null;
    dailyRemaining: number | null;
    monthlyRemaining: number | null;
    plan: string;
    nearLimit: boolean;
  };
};

type FailedSend = { text: string; requestId: string; message: string };

function newRequestId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

const STATUS_TTL_MS = 30_000;
const statusCache = new Map<Language, { at: number; promise: Promise<AIStatus> }>();

async function requestStatus(lang: Language): Promise<AIStatus> {
  try {
    const res = await fetch(`/api/ai/status?lang=${lang}`, { cache: 'no-store' });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json) {
      return { available: false, reason: json?.code ?? 'error', message: json?.error ?? null, suggestions: [] };
    }
    return json as AIStatus;
  } catch {
    statusCache.delete(lang);
    return { available: false, reason: 'network', message: null, suggestions: [] };
  }
}

/** Sidebar, widget, and pages share one in-flight status request. */
function fetchStatus(lang: Language, force = false) {
  const cached = statusCache.get(lang);
  if (!force && cached && Date.now() - cached.at < STATUS_TTL_MS) return cached.promise;
  const promise = requestStatus(lang);
  statusCache.set(lang, { at: Date.now(), promise });
  return promise;
}

export function useAIStatus(lang: Language) {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (force: boolean) => {
      const next = await fetchStatus(lang, force);
      setStatus(next);
      setLoading(false);
    },
    [lang]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);
  return { status, loading, refresh };
}

export function useAIChat(options: { lang: Language; pagePath?: string | null; onSent?: () => void }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [failed, setFailed] = useState<FailedSend | null>(null);
  const optionsRef = useRef(options);
  const conversationRef = useRef<string | null>(null);
  const messagesRef = useRef(messages);
  useEffect(() => {
    optionsRef.current = options;
    conversationRef.current = conversationId;
    messagesRef.current = messages;
  });

  const send = useCallback(
    async (rawText: string, retry?: FailedSend) => {
      const text = rawText.trim();
      if (!text || sending) return;
      const requestId = retry?.requestId ?? newRequestId();
      setFailed(null);
      setSending(true);
      const localId = `local-${requestId}`;
      if (!retry) {
        setMessages((prev) => [
          ...prev,
          {
            id: localId,
            role: 'user',
            content: text,
            response_metadata: null,
            feedback: null,
            created_at: new Date().toISOString(),
            local: true,
          },
        ]);
      }
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            conversationId: conversationRef.current,
            requestId,
            pagePath: optionsRef.current.pagePath ?? null,
            language: optionsRef.current.lang,
          }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.message) {
          // Server rejected or failed: the request is closed, so a retry gets a fresh id.
          setFailed({ text, requestId: newRequestId(), message: json?.error || 'error' });
          return;
        }
        setConversationId(json.conversation.id);
        setTitle(json.conversation.title);
        setMessages((prev) => {
          const withoutLocal = prev.filter((m) => m.id !== localId);
          const user: ChatMessage = json.userMessage ?? {
            id: localId,
            role: 'user',
            content: text,
            response_metadata: null,
            feedback: null,
            created_at: new Date().toISOString(),
          };
          return [...withoutLocal, user, json.message as ChatMessage];
        });
        optionsRef.current.onSent?.();
      } catch {
        // Network failure: the server may still finish, so retry with the same id (idempotent).
        setFailed({ text, requestId, message: 'network' });
      } finally {
        setSending(false);
      }
    },
    [sending]
  );

  const retry = useCallback(() => {
    if (failed) void send(failed.text, failed);
  }, [failed, send]);

  const reset = useCallback(() => {
    setConversationId(null);
    setTitle(null);
    setMessages([]);
    setHasMore(false);
    setFailed(null);
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setLoadingConversation(true);
    setFailed(null);
    try {
      const res = await fetch(`/api/ai/conversations/${id}?limit=30`, { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) {
        setConversationId(null);
        setMessages([]);
        return false;
      }
      setConversationId(json.conversation.id);
      setTitle(json.conversation.title);
      setMessages(json.messages as ChatMessage[]);
      setHasMore(Boolean(json.hasMore));
      return true;
    } finally {
      setLoadingConversation(false);
    }
  }, []);

  const loadOlder = useCallback(async () => {
    const id = conversationRef.current;
    const oldest = messages[0];
    if (!id || !oldest) return;
    const res = await fetch(`/api/ai/conversations/${id}?limit=30&before=${encodeURIComponent(oldest.created_at)}`, {
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json) return;
    setMessages((prev) => [...(json.messages as ChatMessage[]), ...prev]);
    setHasMore(Boolean(json.hasMore));
  }, [messages]);

  const giveFeedback = useCallback(async (messageId: string, value: 1 | -1) => {
    const current = messagesRef.current.find((m) => m.id === messageId);
    const next: 1 | -1 | null = current?.feedback === value ? null : value;
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, feedback: next } : m)));
    await fetch(`/api/ai/messages/${messageId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback: next }),
    }).catch(() => undefined);
  }, []);

  return {
    conversationId,
    title,
    messages,
    hasMore,
    sending,
    loadingConversation,
    failed,
    send,
    retry,
    reset,
    loadConversation,
    loadOlder,
    giveFeedback,
  };
}
