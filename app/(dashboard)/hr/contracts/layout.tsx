import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Employment Contracts',
  'Employment contracts, renewal dates, and expiry risk across staff and teachers.',
  '/hr/contracts'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
