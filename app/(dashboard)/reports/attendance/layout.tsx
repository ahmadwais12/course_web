import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Attendance Reports',
  'Student attendance rates, monthly trends, and class-level breakdown.',
  '/reports/attendance'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
