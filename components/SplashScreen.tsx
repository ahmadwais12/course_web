'use client';

import { useEffect, useState } from 'react';
import { APP_NAME } from '@/lib/branding';
import BrandLogo from '@/components/BrandLogo';

const SESSION_KEY = 'emis-splash-seen';

/**
 * Splash only on the first load of a browser session — not on client-side route changes.
 */
function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export default function SplashScreen() {
  const [show, setShow] = useState(false);
  const [fading, setFading] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    // sessionStorage only on client — skip splash after first visit this session
    if (alreadySeen()) {
      setRemoved(true);
      return;
    }
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* private mode — still show once this mount */
    }
    setShow(true);
    const fadeTimer = setTimeout(() => setFading(true), 1500);
    const removeTimer = setTimeout(() => setRemoved(true), 2100);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (removed || !show) return null;

  return (
    <div
      aria-hidden={fading}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-background text-foreground transition-opacity duration-500 ${
        fading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative flex items-center justify-center px-6">
        <BrandLogo size={84} showName={false} />
      </div>

      <div className="flex flex-col items-center gap-1">
        <h1 className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-3xl font-black tracking-tight text-transparent">
          {APP_NAME}
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          Education Management System
        </p>
      </div>

      <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full w-full rounded-full bg-primary"
          style={{ animation: 'emis-splash-progress 1.5s ease-in-out forwards' }}
        />
      </div>
    </div>
  );
}
