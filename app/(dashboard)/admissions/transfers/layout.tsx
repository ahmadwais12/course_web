import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Student Transfers',
  'Students moving in or out of the institute, with destination and reason.',
  '/admissions/transfers'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
