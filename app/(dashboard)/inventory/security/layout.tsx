import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Two-factor Security',
  'Inventory security policy for two-factor sign-in, deletions, sessions, and backup reminders.',
  '/inventory/security'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
