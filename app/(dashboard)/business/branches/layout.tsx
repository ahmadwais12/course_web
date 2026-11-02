import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Branches',
  'View and manage branches linked to businesses.',
  '/business/branches'
);

export default function PageSeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
