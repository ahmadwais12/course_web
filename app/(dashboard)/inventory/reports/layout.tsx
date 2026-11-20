import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import ReportWorkspace from '@/components/reports/ReportWorkspace';

export const metadata: Metadata = privateAppPageMetadata(
  'Inventory Reports',
  'Review stock health and movement trends, download filtered Excel and CSV reports, and access QR archives.',
  '/inventory/reports'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return <ReportWorkspace>{children}</ReportWorkspace>;
}
