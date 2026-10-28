'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Ports is only a sidebar group — redirect to Grade page */
export default function PortsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/grades');
  }, [router]);
  return null;
}
