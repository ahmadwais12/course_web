import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Handover Report',
  'Review asset handover history and the current holder for every asset.',
  '/inventory/handover'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
