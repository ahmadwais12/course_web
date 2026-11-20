import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Verification Settings',
  'Head office rules for physical verification: evidence requirements, submission policy, and campaign defaults.',
  '/inventory/verification/settings'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
