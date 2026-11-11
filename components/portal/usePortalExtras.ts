'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PortalId } from '@/lib/portals';

export function usePortalExtras<T>(scope: PortalId) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/portal/${scope}/extras`, { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            typeof body?.error === 'string' ? body.error : `Request failed (${response.status})`
          );
        }
        return body as T;
      })
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Failed to load data');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scope, reloadToken]);

  return { data, loading, error, refresh };
}
