import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Portal',
  'Routes each signed-in user to their role-specific portal.',
  '/portal'
);

export default function PortalEntryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
