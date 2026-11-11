import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Admission Enrollment',
  'Turn admitted applicants into enrolled students with a class and academic year.',
  '/admissions/enrollment'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
