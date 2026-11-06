'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { hydrateNotification, type AppNotification } from '@/lib/notifications';
import { toast } from '@/components/ui/Toast';

type UseNotificationsOptions = {
  /** Show a toast when a new notification arrives while this hook is mounted. */
  toastOnInsert?: boolean;
  limit?: number;
};

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { toastOnInsert = true, limit = 40 } = options;
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingTable, setMissingTable] = useState(false);
  const [canSend, setCanSend] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const applyList = useCallback((list: AppNotification[], unreadCount?: number) => {
    setItems(list);
    for (const n of list) seenIdsRef.current.add(n.id);
    if (typeof unreadCount === 'number') setUnread(unreadCount);
    else setUnread(list.filter((n) => !n.is_read).length);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?limit=${limit}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load notifications');
      if (data.missing_table) {
        setMissingTable(true);
        applyList([], 0);
        setError(null);
        return;
      }
      setMissingTable(false);
      setCanSend(Boolean(data.can_send));
      const list = Array.isArray(data.items)
        ? data.items.map((row: Record<string, unknown>) =>
            hydrateNotification(row as Record<string, unknown>)
          )
        : [];
      applyList(list, typeof data.unread === 'number' ? data.unread : undefined);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [applyList, limit]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    );
    setUnread((c) => Math.max(0, c - 1));
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true }),
      });
    } catch {
      /* keep optimistic UI */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at || new Date().toISOString() }))
    );
    setUnread(0);
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
    } catch {
      /* keep optimistic UI */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      userIdRef.current = user.id;

      channel = supabase
        .channel(`in-app-notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = hydrateNotification((payload.new || {}) as Record<string, unknown>);
            if (!row.id || seenIdsRef.current.has(row.id)) return;
            seenIdsRef.current.add(row.id);
            setItems((prev) => [row, ...prev].slice(0, limit));
            if (!row.is_read) setUnread((c) => c + 1);
            if (toastOnInsert) {
              toast.info(row.title, { description: row.message, duration: 5000 });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = hydrateNotification((payload.new || {}) as Record<string, unknown>);
            if (!row.id) return;
            setItems((prev) => {
              const next = prev.map((n) => (n.id === row.id ? row : n));
              setUnread(next.filter((n) => !n.is_read).length);
              return next;
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const old = payload.old as { id?: string } | null;
            if (!old?.id) return;
            setItems((prev) => {
              const next = prev.filter((n) => n.id !== old.id);
              setUnread(next.filter((n) => !n.is_read).length);
              return next;
            });
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [limit, toastOnInsert]);

  return {
    items,
    unread,
    loading,
    error,
    missingTable,
    canSend,
    refresh: load,
    markRead,
    markAllRead,
  };
}
