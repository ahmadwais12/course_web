'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { PortalData, PortalDataMap } from '@/lib/portal-types';
import type { PortalId } from '@/lib/portals';

type PortalDataContextValue = {
  data: PortalData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const PortalDataContext = createContext<PortalDataContextValue | null>(null);

/** One self-scoped summary request per portal — every portal page reads from it. */
export function PortalDataProvider({
  portal,
  children,
}: {
  portal: PortalId;
  children: React.ReactNode;
}) {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/portal/${portal}`, { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            typeof body?.error === 'string' ? body.error : `Request failed (${response.status})`
          );
        }
        return body as PortalData;
      })
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Failed to load portal data');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [portal, reloadToken]);

  return (
    <PortalDataContext.Provider value={{ data, loading, error, refresh }}>
      {children}
    </PortalDataContext.Provider>
  );
}

export function usePortalData<P extends PortalId>(portal: P): {
  data: PortalDataMap[P] | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const ctx = useContext(PortalDataContext);
  if (!ctx) throw new Error('usePortalData must be used inside PortalDataProvider');

  return {
    data: ctx.data && ctx.data.portal === portal ? (ctx.data as PortalDataMap[P]) : null,
    loading: ctx.loading,
    error: ctx.error,
    refresh: ctx.refresh,
  };
}
