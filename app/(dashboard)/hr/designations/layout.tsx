import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Designations',
  'Job titles across the institute with headcount, departments, and salary bands.',
  '/hr/designations'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
