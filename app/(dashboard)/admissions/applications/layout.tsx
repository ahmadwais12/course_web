import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Admission Applications',
  'Admission enquiries and applications from first contact to admission.',
  '/admissions/applications'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
