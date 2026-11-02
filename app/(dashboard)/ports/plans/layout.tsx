import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Plans',
  'Manage business plan pricing, duration, features, and storage limits.',
  '/ports/plans'
);

export default function PageSeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
