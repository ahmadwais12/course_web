'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Maximize2, Minus, Plus, Sparkles, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import AIChatPanel from '@/components/ai/AIChatPanel';
import { AI_STRINGS } from '@/components/ai/strings';
import { useAIChat, useAIStatus } from '@/components/ai/useAIChat';

const STORAGE_KEY = 'dreamflow-ai-widget-conversation';
const HIDDEN_REASONS = new Set(['ai_tables_missing', 'role_not_allowed', 'unauthorized', 'no_organization', 'account_inactive', 'forbidden']);

/** Floating assistant available on every dashboard page (except the full AI Assistant page). */
export default function AIAssistantWidget() {
  const pathname = usePathname() || '';
  const { lang } = useLanguage();
  const strings = AI_STRINGS[lang];
  const [open, setOpen] = useState(false);
  const { status, refresh } = useAIStatus(lang);
  const chat = useAIChat({ lang, pagePath: pathname, onSent: () => void refresh() });
  const restored = useRef(false);

  useEffect(() => {
    if (!open || restored.current) return;
    restored.current = true;
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) void chat.loadConversation(saved).then((ok) => !ok && sessionStorage.removeItem(STORAGE_KEY));
  }, [open, chat]);

  useEffect(() => {
    if (chat.conversationId) sessionStorage.setItem(STORAGE_KEY, chat.conversationId);
  }, [chat.conversationId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (pathname.startsWith('/ai-assistant')) return null;
  if (!status || (!status.available && HIDDEN_REASONS.has(status.reason ?? ''))) return null;

  const newChat = () => {
    chat.reset();
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="fixed bottom-4 end-4 z-40 flex flex-col items-end gap-3 print:hidden">
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={strings.assistant}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="flex h-[min(600px,calc(100vh-6rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#88b6ff] text-[#142033]">
                <Sparkles size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{chat.title || strings.assistant}</p>
                <p className="truncate text-[11px] text-muted-foreground">{status.scope || strings.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={newChat}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={strings.newChat}
                title={strings.newChat}
              >
                <Plus size={16} />
              </button>
              <Link
                href={chat.conversationId ? `/ai-assistant?c=${chat.conversationId}` : '/ai-assistant'}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={strings.expand}
                title={strings.expand}
                onClick={() => setOpen(false)}
              >
                <Maximize2 size={15} />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={strings.minimize}
                title={strings.minimize}
              >
                <Minus size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  newChat();
                }}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={strings.close}
                title={strings.close}
              >
                <X size={16} />
              </button>
            </div>
            <AIChatPanel chat={chat} status={status} strings={strings} compact className="flex-1" />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={strings.open}
        aria-expanded={open}
        title={strings.assistant}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#88b6ff] text-[#142033] shadow-lg transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? <X size={20} /> : <Sparkles size={20} />}
      </button>
    </div>
  );
}
