'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { DataRefreshProvider } from '@/context/DataRefreshContext';
import { useRouter } from 'next/navigation';

/** Survive layout remounts so the shell (sidebar/header) never flashes away. */
let cachedAuthed: boolean | null = null;
let cachedRole = 'user';
let cachedUser: {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
} | null = null;

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
  const [user, setUser] = useState(cachedUser);

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
        if (!cancelled && dbUser && !dbUser.error) {
          if (dbUser.role) {
            cachedRole = dbUser.role;
            setRole(dbUser.role);
          }
          cachedUser = {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            role: dbUser.role,
            avatarUrl: dbUser.avatarUrl,
          };
          setUser(cachedUser);
        }
      } catch {
        /* keep default role */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  if (authed === false || authed === null) {
    return (
      <div className="emis-shell flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-4 px-6 animate-fade-in">
          <div className="emis-shimmer mx-auto h-12 w-12 rounded-2xl bg-muted" />
          <div className="emis-shimmer mx-auto h-4 w-40 rounded-lg bg-muted" />
          <div className="emis-shimmer mx-auto h-3 w-56 rounded-lg bg-muted" />
          <p className="text-center text-sm text-muted-foreground">
            {authed === false ? 'Redirecting…' : 'Loading workspace…'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <DataRefreshProvider>
      <DashboardLayout role={role} user={user}>
        {children}
      </DashboardLayout>
    </DataRefreshProvider>
  );
}
