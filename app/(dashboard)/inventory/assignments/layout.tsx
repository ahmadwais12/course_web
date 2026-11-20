import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Assignments',
  'Track assets assigned to holders, issue dates, and returns.',
  '/inventory/assignments'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
