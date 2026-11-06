'use client';

import { useEffect, useRef } from 'react';

type UseLiveRefreshOptions = {
  /** Interval in ms (default 15s). */
  intervalMs?: number;
  /** When false, ticks are skipped (e.g. dialog open). */
  enabled?: boolean;
  /** Soft data fetch — must NOT toggle full-page loading. */
  onRefresh: () => void | Promise<void>;
};

/**
 * Polls on an interval without remounting the page or flashing loading UI.
 * Skips ticks while the document is hidden.
 */
export function useLiveRefresh({
  intervalMs = 15_000,
  enabled = true,
  onRefresh,
}: UseLiveRefreshOptions) {
  const onRefreshRef = useRef(onRefresh);
  const enabledRef = useRef(enabled);
  const inflightRef = useRef(false);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    const tick = () => {
      if (!enabledRef.current || document.hidden || inflightRef.current) return;
      inflightRef.current = true;
      Promise.resolve(onRefreshRef.current())
        .catch(() => {
          /* silent — keep current UI */
        })
        .finally(() => {
          inflightRef.current = false;
        });
    };

    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
}
