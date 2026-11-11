import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Student Reports',
  'Enrollment numbers, class distribution, attendance, and outstanding balances.',
  '/reports/students'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
