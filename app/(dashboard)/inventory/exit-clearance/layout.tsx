import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Exit Clearance',
  'Clear departing staff of assets held and outstanding returns.',
  '/inventory/exit-clearance'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
