import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'HR Reports',
  'Headcount, department distribution, payroll runs, and staff leave.',
  '/reports/hr'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
