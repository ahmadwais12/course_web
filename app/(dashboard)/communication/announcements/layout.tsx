import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Announcements',
  'Publish announcements to students, guardians, teachers, and staff and notify them in the app.',
  '/communication/announcements'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
