'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type DataRefreshContextValue = {
  tick: number;
  notify: () => void;
};

const DataRefreshContext = createContext<DataRefreshContextValue>({
  tick: 0,
  notify: () => {},
});

const SKIP_NOTIFY = /\/api\/(auth\/sync|analytics\/|messaging\/|notifications)/i;

function isMutatingMethod(method?: string) {
  const value = (method || 'GET').toUpperCase();
  return value === 'POST' || value === 'PUT' || value === 'PATCH' || value === 'DELETE';
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

export function DataRefreshProvider({ children }: { children: React.ReactNode }) {
  const [tick, setTick] = useState(0);
  const timerRef = useRef<number | null>(null);

  const notify = useCallback(() => {
    if (typeof document !== 'undefined' && document.querySelector('[role="dialog"]')) {
      return;
    }
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setTick((value) => value + 1);
    }, 250);
  }, []);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method || (input instanceof Request ? input.method : 'GET');
      const url = requestUrl(input);
      const isGet = !isMutatingMethod(method);
      const nextInit: RequestInit = {
        ...init,
        cache: isGet ? 'no-store' : init?.cache,
      };
      const response = await originalFetch(input, nextInit);
      if (
        response.ok &&
        isMutatingMethod(method) &&
        url.includes('/api/') &&
        !SKIP_NOTIFY.test(url)
      ) {
        notify();
      }
      return response;
    };

    const supabase = createClient();
    const liveTables = [
      'tenants',
      'users',
      'roles',
      'permissions',
      'students',
      'courses',
      'classes',
      'grades',
      'payments',
      'staff',
      'business_plans',
      'business_types',
      'messaging_types',
      'notifications',
      'student_levels',
    ];
    let channel = supabase.channel('dreamflow-live-data');
    for (const table of liveTables) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => notify()
      );
    }
    channel.subscribe();

    return () => {
      window.fetch = originalFetch;
      supabase.removeChannel(channel);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [notify]);

  const value = useMemo(() => ({ tick, notify }), [tick, notify]);
  return <DataRefreshContext.Provider value={value}>{children}</DataRefreshContext.Provider>;
}

export function useDataRefresh() {
  return useContext(DataRefreshContext);
}

/** Re-run a page loader whenever live data changes. */
export function useLiveData(load: () => void) {
  const { tick } = useDataRefresh();
  const skipFirst = useRef(true);
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    load();
  }, [tick, load]);
}
