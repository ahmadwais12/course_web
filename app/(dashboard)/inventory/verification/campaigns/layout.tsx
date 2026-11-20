import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Verification Campaigns',
  'Plan physical asset audit campaigns, assign branches and officers, and track completion.',
  '/inventory/verification/campaigns'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
