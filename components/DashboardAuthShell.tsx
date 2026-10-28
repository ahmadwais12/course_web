'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

/** Survive layout remounts so the shell (sidebar/header) never flashes away. */
let cachedAuthed: boolean | null = null;
let cachedRole = 'user';

/**
 * Shared app shell — Sidebar + top bar stay mounted across route changes.
 * Only `{children}` (the page) swaps, so the whole site does not remount.
 */
export default function DashboardAuthShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [role, setRole] = useState<string>(cachedRole);
  const [authed, setAuthed] = useState<boolean | null>(cachedAuthed);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        cachedAuthed = false;
        if (!cancelled) setAuthed(false);
        router.replace('/login');
        return;
      }
      cachedAuthed = true;
      if (!cancelled) setAuthed(true);
      try {
        const res = await fetch('/api/auth/sync', { method: 'POST' });
        const dbUser = await res.json();
        if (!cancelled && dbUser?.role) {
          cachedRole = dbUser.role;
          setRole(dbUser.role);
        }
      } catch {
        /* keep default role */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  if (authed === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return <DashboardLayout role={role}>{children}</DashboardLayout>;
}
