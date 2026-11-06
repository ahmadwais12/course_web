'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bot, Check, Copy, ExternalLink, Loader2, RotateCcw, Send, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import { ErrorBanner, PortButton, TextAreaField } from '@/components/ports';
import { cn } from '@/lib/utils';
import AIChart from '@/components/ai/AIChart';
import AIMarkdown from '@/components/ai/AIMarkdown';
import type { AIStrings } from '@/components/ai/strings';
import type { AIStatus, ChatMessage, useAIChat } from '@/components/ai/useAIChat';

type Chat = ReturnType<typeof useAIChat>;

function MessageBubble({
  message,
  strings,
  onFeedback,
}: {
  message: ChatMessage;
  strings: AIStrings;
  onFeedback: (id: string, value: 1 | -1) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const meta = message.response_metadata;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          dir="auto"
          className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-ee-md bg-[#88b6ff] px-3.5 py-2 text-sm text-[#142033]"
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Bot size={15} />
      </div>
      <div className="min-w-0 max-w-[92%] flex-1">
        <div dir="auto" className="rounded-2xl rounded-ss-md border border-border bg-card px-3.5 py-2.5 text-foreground">
          <AIMarkdown content={message.content} />
          {meta?.charts?.map((chart, i) => (
            <AIChart key={i} chart={chart} />
          ))}
          {!!meta?.links?.length && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {meta.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                >
                  {link.label}
                  <ExternalLink size={11} />
                </Link>
              ))}
            </div>
          )}
          {!!meta?.sources?.length && (
            <div className="mt-3 border-t border-border pt-2">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{strings.sources}</p>
              <ol className="space-y-0.5 text-xs text-muted-foreground">
                {meta.sources.map((s) => (
                  <li key={s.index}>
                    <span className="me-1 font-semibold text-primary">[{s.index}]</span>
                    {s.title}
                    <span className="ms-1 opacity-70">· {s.scope === 'organization' ? strings.orgDoc : strings.platformDoc}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
        {!message.local && (
          <div className="mt-1 flex items-center gap-0.5 text-muted-foreground">
            <button
              type="button"
              onClick={copy}
              className="rounded-md p-1.5 hover:bg-muted hover:text-foreground"
              aria-label={copied ? strings.copied : strings.copy}
              title={copied ? strings.copied : strings.copy}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
            <button
              type="button"
              onClick={() => onFeedback(message.id, 1)}
              className={cn('rounded-md p-1.5 hover:bg-muted hover:text-foreground', message.feedback === 1 && 'text-emerald-600')}
              aria-label={strings.helpful}
              aria-pressed={message.feedback === 1}
              title={strings.helpful}
            >
              <ThumbsUp size={13} />
            </button>
            <button
              type="button"
              onClick={() => onFeedback(message.id, -1)}
              className={cn('rounded-md p-1.5 hover:bg-muted hover:text-foreground', message.feedback === -1 && 'text-destructive')}
              aria-label={strings.notHelpful}
              aria-pressed={message.feedback === -1}
              title={strings.notHelpful}
            >
              <ThumbsDown size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIChatPanel({
  chat,
  status,
  strings,
  className,
  compact = false,
}: {
  chat: Chat;
  status: AIStatus | null;
  strings: AIStrings;
  className?: string;
  compact?: boolean;
}) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const available = status?.available !== false;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages.length, chat.sending, chat.failed]);

  const submit = (text = input) => {
    if (!text.trim() || chat.sending || !available) return;
    setInput('');
    void chat.send(text);
  };

  const failedMessage =
    chat.failed?.message === 'network' ? strings.error : chat.failed?.message === 'error' ? strings.error : chat.failed?.message;

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-4" aria-live="polite">
        {chat.hasMore && (
          <div className="flex justify-center">
            <PortButton variant="ghost" className="h-8 text-xs" onClick={() => void chat.loadOlder()}>
              {strings.loadOlder}
            </PortButton>
          </div>
        )}

        {chat.loadingConversation && (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="animate-spin" size={20} />
          </div>
        )}

        {!chat.loadingConversation && chat.messages.length === 0 && (
          <div className="space-y-4 py-2">
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles size={15} />
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">{available ? strings.welcome : strings.unavailable}</p>
                {available ? (
                  <p className="text-xs text-muted-foreground">{strings.readOnly}</p>
                ) : (
                  status?.message && <p className="text-xs text-muted-foreground">{status.message}</p>
                )}
              </div>
            </div>
            {available && !!status?.suggestions?.length && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{strings.suggestions}</p>
                <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
                  {status.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      dir="auto"
                      onClick={() => submit(s)}
                      className="rounded-xl border border-border bg-card px-3 py-2 text-start text-sm text-foreground transition hover:border-[#88b6ff] hover:bg-muted"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {chat.messages.map((m) => (
          <MessageBubble key={m.id} message={m} strings={strings} onFeedback={chat.giveFeedback} />
        ))}

        {chat.sending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="animate-spin" size={15} />
            {strings.thinking}
          </div>
        )}

        {chat.failed && !chat.sending && (
          <div className="space-y-2">
            <ErrorBanner message={failedMessage || strings.error} />
            <PortButton variant="secondary" className="h-8 text-xs" onClick={chat.retry}>
              <RotateCcw size={13} />
              {strings.retry}
            </PortButton>
          </div>
        )}
      </div>

      {status?.usage?.nearLimit && (
        <p className="border-t border-border bg-amber-50 px-4 py-1.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          {strings.nearLimit}
        </p>
      )}

      <form
        className="flex items-end gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="min-w-0 flex-1">
          <TextAreaField
            aria-label={strings.placeholder}
            dir="auto"
            value={input}
            maxLength={4000}
            disabled={!available}
            placeholder={strings.placeholder}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            className="max-h-32 min-h-[42px] resize-none py-2"
          />
        </div>
        <PortButton
          type="submit"
          variant="primary"
          disabled={!available || chat.sending || !input.trim()}
          aria-label={strings.send}
          className="h-[42px] px-3"
        >
          {chat.sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} className="rtl:-scale-x-100" />}
        </PortButton>
      </form>
    </div>
  );
}
