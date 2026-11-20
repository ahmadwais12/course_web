import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Create Verification Campaign',
  'Create a physical verification campaign with branches, assigned officers, scope, and instructions.',
  '/inventory/verification/campaigns/new'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
