import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'SMS',
  'Send SMS messages to students, guardians, and staff and review delivery history.',
  '/communication/sms'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
