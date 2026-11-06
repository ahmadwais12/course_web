'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { DataRefreshProvider } from '@/context/DataRefreshContext';
import BrandLoader from '@/components/ports/BrandLoader';
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
        <BrandLoader
          className="animate-fade-in"
          label={authed === false ? 'Redirecting…' : 'Loading workspace…'}
        />
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
