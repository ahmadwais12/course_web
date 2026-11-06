'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck } from 'lucide-react';
import { PortButton } from '@/components/ports';
import { usePortsMotion } from '@/components/ports/motion';
import { useNotifications } from '@/hooks/useNotifications';
import { relativeTime } from '@/lib/notifications';
import { cn } from '@/lib/utils';

export default function NotificationBell({ isRTL = false }: { isRTL?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { pop } = usePortsMotion();
  const { items, unread, loading, missingTable, markRead, markAllRead } = useNotifications({
    toastOnInsert: true,
  });

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openItem = async (id: string, actionUrl?: string | null) => {
    await markRead(id);
    setOpen(false);
    if (actionUrl) router.push(actionUrl);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={20} />
        {unread > 0 ? (
          <span
            className={cn(
              'absolute top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground',
              isRTL ? 'left-1' : 'right-1'
            )}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="notification-panel"
            role="dialog"
            aria-label="Notifications"
            className={cn(
              'absolute top-[calc(100%+0.5rem)] z-50 w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-card',
              isRTL ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
            )}
            {...pop}
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
              <div>
                <p className="m-0 text-sm font-semibold text-foreground">Notifications</p>
                <p className="m-0 text-[11px] text-muted-foreground">
                  {missingTable
                    ? 'Table not migrated yet'
                    : unread > 0
                      ? `${unread} unread`
                      : 'You are up to date'}
                </p>
              </div>
              {unread > 0 ? (
                <PortButton
                  type="button"
                  variant="ghost"
                  className="h-8 gap-1 px-2 text-xs"
                  onClick={() => markAllRead()}
                >
                  <CheckCheck size={14} />
                  Mark all
                </PortButton>
              ) : null}
            </div>

            <div className="max-h-[22rem] overflow-y-auto">
              {loading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="emis-shimmer h-14 rounded-xl bg-muted" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell className="mx-auto mb-2 text-muted-foreground/50" size={28} />
                  <p className="m-0 text-sm font-medium text-foreground">No notifications yet</p>
                  <p className="m-0 mt-1 text-xs text-muted-foreground">
                    New alerts for active users appear here in real time.
                  </p>
                </div>
              ) : (
                <ul className="m-0 list-none p-0">
                  {items.slice(0, 12).map((n) => (
                    <li key={n.id} className="border-b border-border/70 last:border-0">
                      <button
                        type="button"
                        onClick={() => openItem(n.id, n.action_url)}
                        className={cn(
                          'flex w-full flex-col gap-0.5 px-3 py-2.5 text-start hover:bg-muted/60',
                          !n.is_read && 'bg-[#88b6ff]/10'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">{n.title}</span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {relativeTime(n.created_at)}
                          </span>
                        </div>
                        <span className="line-clamp-2 text-xs text-muted-foreground">{n.message}</span>
                        {!n.is_read ? (
                          <span className="mt-1 inline-flex w-fit rounded-full bg-[#88b6ff]/25 px-1.5 py-0.5 text-[10px] font-semibold text-[#142033] dark:text-[#88b6ff]">
                            New
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-border px-3 py-2">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="block rounded-lg py-1.5 text-center text-xs font-semibold text-[#5b86c7] hover:bg-muted"
              >
                See all notifications
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
