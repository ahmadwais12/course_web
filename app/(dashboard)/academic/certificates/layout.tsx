import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Certificates',
  'Completion, achievement, and merit certificates issued to students.',
  '/academic/certificates'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
