import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Localization',
  'Date, time, number, and layout preferences for your region.',
  '/system/localization'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
