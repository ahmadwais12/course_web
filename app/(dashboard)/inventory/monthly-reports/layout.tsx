import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Monthly Reports',
  'Monthly stock movement, GRN, purchase, and handover summaries with downloads.',
  '/inventory/monthly-reports'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
