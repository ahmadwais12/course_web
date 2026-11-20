import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Upload Excel',
  'Import inventory items, assets, and suppliers from an Excel workbook.',
  '/inventory/import'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
