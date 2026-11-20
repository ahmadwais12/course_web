import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Duty Stations',
  'Manage duty stations used for staff and asset locations.',
  '/inventory/duty-stations'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
