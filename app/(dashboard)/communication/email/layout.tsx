import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Email',
  'Send emails to students, guardians, and staff and review delivery history.',
  '/communication/email'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
