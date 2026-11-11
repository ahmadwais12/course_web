import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Enrollment',
  'Students mapped to a class and academic year with enrollment status and grade.',
  '/academic/enrollment'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
