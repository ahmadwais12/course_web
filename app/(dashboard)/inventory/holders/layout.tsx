import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Asset Holders',
  'Manage the people and offices that hold registered assets.',
  '/inventory/holders'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
