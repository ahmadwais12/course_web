import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Academic Years',
  'Session calendar with the current year, term counts, and enrollment totals.',
  '/organization/academic-years'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
