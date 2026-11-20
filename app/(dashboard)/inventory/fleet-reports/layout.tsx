import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Fleet Reports',
  'Distance and fuel use per vehicle from the vehicle and fuel logs.',
  '/inventory/fleet-reports'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
