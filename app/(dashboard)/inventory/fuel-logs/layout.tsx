import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Fuel Log',
  'Fuel purchases by vehicle, liters, cost, and odometer.',
  '/inventory/fuel-logs'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
