import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'General Settings',
  'Institute identity and contact details used across the app and public pages.',
  '/system/general'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
