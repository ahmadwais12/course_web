'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BrandLoader from '@/components/ports/BrandLoader';
import { portalHomeForRole } from '@/lib/portals';

/** Sends each signed-in role to the portal that matches it. */
export default function PortalEntryPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch('/api/auth/sync', { method: 'POST' });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body?.id) throw new Error('unauthenticated');
        if (!cancelled) router.replace(portalHomeForRole(String(body.role ?? '')));
      } catch {
        if (!cancelled) router.replace('/login');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <BrandLoader label="Routing to your portal…" />
    </div>
  );
}
