import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Vehicle Logs',
  'Trips and odometer readings for each fleet vehicle.',
  '/inventory/vehicle-logs'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
