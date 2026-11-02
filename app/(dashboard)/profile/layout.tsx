import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Profile',
  'View and update your DreamFlow account profile.',
  '/profile'
);

export default function PageSeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
