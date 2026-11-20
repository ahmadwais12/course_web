import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Vehicles',
  'Fleet register with plate, model, driver, odometer, and status.',
  '/inventory/vehicles'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
