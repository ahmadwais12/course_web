'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { usePortsMotion } from '@/components/ports/motion';
import { LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/context/LanguageContext';

export type NavUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
};

function initialsFrom(name?: string | null, email?: string | null) {
  const source = (name || email || 'U').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default function NavUserMenu({ user }: { user?: NavUser | null }) {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const { pop } = usePortsMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadingUser = !user?.name && !user?.email;
  const name = user?.name || t.allAccess;
  const email = user?.email || '';
  const avatarUrl = user?.avatarUrl || null;
  const initials = initialsFrom(name, email);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = 224;
    const left = isRTL ? rect.left : Math.min(rect.right - width, window.innerWidth - width - 8);
    setPos({ top: rect.bottom + 8, left: Math.max(8, left) });
  }, [open, isRTL]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    try {
      await fetch('/api/users/login-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'logout', details: { source: 'nav_user_menu' } }),
      });
    } catch {
      // best-effort — still sign out
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title={name}
        aria-label={t.profile}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border',
          'bg-muted text-[11px] font-bold text-foreground shadow-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          open && 'ring-2 ring-primary/40'
        )}
      >
        {loadingUser ? (
          <span role="status" aria-label="Loading" className="ports-name-shimmer h-full w-full" />
        ) : avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </button>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                key="nav-user-menu"
                ref={menuRef}
                role="menu"
                className="fixed z-[200] w-56 overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
                style={{ top: pos.top, left: pos.left, transformOrigin: isRTL ? 'top left' : 'top right' }}
                {...pop}
              >
                <div className="border-b border-border px-3 py-2">
                  {loadingUser ? (
                    <span
                      role="status"
                      aria-label="Loading"
                      className="ports-name-shimmer block h-4 w-[7.5rem] max-w-[85%] rounded-md"
                    />
                  ) : (
                    <p className="truncate text-sm font-semibold">{name}</p>
                  )}
                  {email ? <p className="truncate text-xs text-muted-foreground">{email}</p> : null}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted"
                  onClick={() => {
                    setOpen(false);
                    router.push('/profile');
                  }}
                >
                  <User size={16} />
                  {t.profile}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  {t.logout}
                </button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
