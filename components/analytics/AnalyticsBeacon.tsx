'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const VISITOR_KEY = 'emis_aid';
const SESSION_KEY = 'emis_sid';
const SESSION_TS = 'emis_sid_ts';
const EXCLUDE_KEY = 'emis_analytics_exclude';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readUtm(search: string) {
  const q = new URLSearchParams(search);
  return {
    source: q.get('utm_source') || undefined,
    medium: q.get('utm_medium') || undefined,
    campaign: q.get('utm_campaign') || undefined,
    term: q.get('utm_term') || undefined,
    content: q.get('utm_content') || undefined,
  };
}

function ensureIds() {
  let anonymousId = localStorage.getItem(VISITOR_KEY);
  if (!anonymousId) {
    anonymousId = uuid();
    localStorage.setItem(VISITOR_KEY, anonymousId);
  }

  const now = Date.now();
  const ts = Number(sessionStorage.getItem(SESSION_TS) || 0);
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId || !ts || now - ts > SESSION_TIMEOUT_MS) {
    sessionId = uuid();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  sessionStorage.setItem(SESSION_TS, String(now));
  return { anonymousId, sessionId };
}

async function send(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/collect', blob);
      return;
    }
    await fetch('/api/analytics/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    /* non-critical */
  }
}

/**
 * Lightweight first-party pageview tracker.
 * Handles App Router navigations without double-counting the same path burst.
 */
export default function AnalyticsBeacon() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPath = useRef<string>('');
  const lastSentAt = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(EXCLUDE_KEY) === '1') return;
    if (navigator.webdriver) return;

    const search = searchParams?.toString() ? `?${searchParams.toString()}` : '';
    const path = `${pathname || '/'}${search}`;
    const now = Date.now();
    // Dedupe rapid duplicate effects (React Strict Mode / soft nav)
    if (path === lastPath.current && now - lastSentAt.current < 800) return;
    lastPath.current = path;
    lastSentAt.current = now;

    const { anonymousId, sessionId } = ensureIds();
    const utm = readUtm(search);

    void send({
      type: 'pageview',
      anonymousId,
      sessionId,
      path: pathname || '/',
      title: document.title,
      referrer: document.referrer || null,
      language: navigator.language,
      screenWidth: window.screen?.width,
      screenHeight: window.screen?.height,
      utm,
      exclude: localStorage.getItem(EXCLUDE_KEY) === '1',
    });

    const heartbeat = window.setInterval(() => {
      const ids = ensureIds();
      void send({
        type: 'heartbeat',
        anonymousId: ids.anonymousId,
        sessionId: ids.sessionId,
        path: pathname || '/',
        title: document.title,
        referrer: document.referrer || null,
      });
    }, 60_000);

    return () => window.clearInterval(heartbeat);
  }, [pathname, searchParams]);

  return null;
}

/** Optional helper for meaningful business events. */
export function trackEvent(name: string, props?: Record<string, unknown>) {
  try {
    if (localStorage.getItem(EXCLUDE_KEY) === '1') return;
    const { anonymousId, sessionId } = ensureIds();
    void send({
      type: 'event',
      anonymousId,
      sessionId,
      path: window.location.pathname,
      title: document.title,
      eventName: name,
      eventProps: props || {},
    });
  } catch {
    /* ignore */
  }
}
