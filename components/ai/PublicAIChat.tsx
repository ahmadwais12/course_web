'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Bot, RotateCcw, Send, Sparkles } from 'lucide-react';
import { ErrorBanner, PortButton, TextAreaField } from '@/components/ports';
import AIMarkdown from '@/components/ai/AIMarkdown';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

type PublicSource = { index: number; title: string };

type PublicMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: PublicSource[];
};

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const MAX_INPUT = 2000;

/** Signed-out chat: documentation answers only, no history persistence. */
export default function PublicAIChat() {
  const { lang } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ai/public/status?lang=${lang}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setAvailable(json?.available !== false);
        setStatusMessage(typeof json?.message === 'string' ? json.message : null);
        setSuggestions(Array.isArray(json?.suggestions) ? (json.suggestions as string[]) : []);
      })
      .catch(() => {
        if (cancelled) return;
        setAvailable(false);
        setStatusMessage('The assistant is unavailable right now. Please try again later.');
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [messages.length, sending, error, reduceMotion]);

  const requestAnswer = async (value: string, historyMessages: PublicMessage[]) => {
    setError(null);
    setSending(true);
    try {
      const history = historyMessages
        .slice(-6)
        .map((message) => ({ role: message.role, content: message.content }));
      const res = await fetch('/api/ai/public/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: value, history, language: lang }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || typeof json?.reply !== 'string') {
        throw new Error(
          typeof json?.error === 'string' ? json.error : 'The assistant could not answer. Please try again.'
        );
      }
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          content: json.reply as string,
          sources: Array.isArray(json.sources) ? (json.sources as PublicSource[]) : [],
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const send = (text = input) => {
    const value = text.trim();
    if (!value || sending || available === false) return;
    setInput('');
    setError(null);
    const userMessage: PublicMessage = { id: newId(), role: 'user', content: value };
    setMessages((prev) => [...prev, userMessage]);
    void requestAnswer(value, [...messages, userMessage]);
  };

  const retry = () => {
    const lastUser = [...messages].reverse().find((message) => message.role === 'user');
    if (lastUser) void requestAnswer(lastUser.content, messages);
  };

  const newChat = () => {
    if (sending) return;
    setMessages([]);
    setError(null);
  };

  const disabled = available === false;
  const hasMessages = messages.length > 0;

  return (
    <div className="relative flex h-[min(74vh,700px)] min-h-[440px] flex-col overflow-hidden rounded-[2rem] border border-border/80 bg-card/85 shadow-2xl backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#88b6ff]/10 to-transparent"
      />

      <div className="relative flex items-center gap-3 border-b border-border/70 px-4 py-3 sm:px-5">
        <div className="relative shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a9cbff] to-[#6aa0f5] text-[#0d1a2b] shadow-md">
            <Sparkles size={18} />
          </div>
          <span
            className={cn(
              'absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-card',
              disabled ? 'bg-zinc-400' : 'bg-emerald-500'
            )}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
            DreamFlow Assistant
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              Public
            </span>
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {disabled ? 'Currently unavailable' : statusMessage || 'Documentation help · no sign-in needed'}
          </p>
        </div>

        {hasMessages && (
          <button
            type="button"
            onClick={newChat}
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-50"
            aria-label="Start a new chat"
            title="Start a new chat"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">New chat</span>
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-busy={sending}
        className="relative min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5"
      >
        {!hasMessages && (
          <div className="flex h-full flex-col items-center justify-center px-1 py-4 text-center">
            <div className="relative mb-5">
              <div
                aria-hidden
                className={cn(
                  'absolute inset-0 rounded-2xl bg-[#88b6ff]/40 blur-xl',
                  reduceMotion ? '' : 'motion-safe:animate-pulse'
                )}
              />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a9cbff] to-[#6aa0f5] text-[#0d1a2b] shadow-lg">
                <Sparkles size={24} />
              </div>
            </div>
            <h2 className="text-lg font-black text-foreground">
              {disabled ? 'The assistant is unavailable right now' : 'How can I help you today?'}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {disabled
                ? statusMessage
                : 'I can walk you through features, navigation, and setup — grounded in the DreamFlow documentation.'}
            </p>

            {!disabled && suggestions.length > 0 && (
              <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    dir="auto"
                    onClick={() => send(suggestion)}
                    className="group flex items-start gap-2.5 rounded-xl border border-border bg-background/70 p-3 text-start text-sm text-foreground transition duration-200 hover:-translate-y-0.5 hover:border-[#88b6ff] hover:bg-background hover:shadow-md"
                  >
                    <Sparkles size={14} className="mt-0.5 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">{suggestion}</span>
                    <ArrowUpRight
                      size={14}
                      className="mt-0.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message) =>
            message.role === 'user' ? (
              <motion.div
                key={message.id}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex justify-end"
              >
                <div
                  dir="auto"
                  className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-ee-md bg-gradient-to-br from-[#9cc4ff] to-[#7fb0fb] px-4 py-2.5 text-sm text-[#0d1a2b] shadow-sm"
                >
                  {message.content}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={message.id}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex gap-2.5"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot size={16} />
                </div>
                <div className="min-w-0 max-w-[92%] flex-1">
                  <div
                    dir="auto"
                    className="rounded-2xl rounded-ss-md border border-border/80 bg-background/85 px-4 py-3 text-foreground shadow-sm"
                  >
                    <AIMarkdown content={message.content} />
                    {!!message.sources?.length && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/70 pt-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Sources
                        </span>
                        {message.sources.map((source) => (
                          <span
                            key={source.index}
                            className="inline-flex max-w-[240px] items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground"
                            title={source.title}
                          >
                            <span className="font-bold text-primary">[{source.index}]</span>
                            <span className="truncate">{source.title}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>

        {sending && (
          <div className="flex gap-2.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot size={16} />
            </div>
            <div className="flex items-center gap-1 rounded-2xl rounded-ss-md border border-border/80 bg-background/85 px-4 py-3.5 shadow-sm">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="h-1.5 w-1.5 motion-safe:animate-bounce rounded-full bg-muted-foreground/70"
                  style={{ animationDelay: `${dot * 140}ms` }}
                />
              ))}
              <span className="sr-only">Assistant is thinking</span>
            </div>
          </div>
        )}

        {error && !sending && (
          <div className="space-y-2">
            <ErrorBanner message={error} />
            <PortButton variant="secondary" className="h-8 text-xs" onClick={retry}>
              <RotateCcw size={13} />
              Try again
            </PortButton>
          </div>
        )}
      </div>

      <form
        className="border-t border-border/70 bg-card/60 p-3 sm:p-4"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background/80 p-1.5 transition focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15">
          <div className="min-w-0 flex-1">
            <TextAreaField
              aria-label="Ask the assistant"
              dir="auto"
              value={input}
              maxLength={MAX_INPUT}
              disabled={disabled}
              placeholder={disabled ? 'Assistant unavailable' : 'Ask how DreamFlow works…'}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  send();
                }
              }}
              rows={1}
              className="max-h-36 min-h-[44px] resize-none border-0 bg-transparent px-3 py-2.5 shadow-none focus:border-0 focus:ring-0"
            />
          </div>
          <PortButton
            type="submit"
            variant="primary"
            disabled={disabled || sending || !input.trim()}
            aria-label="Send message"
            className="h-10 w-10 shrink-0 rounded-xl px-0"
          >
            <Send size={16} className="rtl:-scale-x-100" />
          </PortButton>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[11px] text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Sparkles size={11} className="shrink-0" />
            <span className="truncate">Answers come from the DreamFlow docs — verify critical details.</span>
          </span>
          <span className="hidden shrink-0 sm:inline">
            {input.length > MAX_INPUT - 400 ? `${input.length}/${MAX_INPUT}` : 'Enter to send · Shift + Enter for a new line'}
          </span>
        </div>
      </form>
    </div>
  );
}
