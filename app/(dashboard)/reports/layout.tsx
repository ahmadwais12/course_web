import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import ReportWorkspace from '@/components/reports/ReportWorkspace';

export const metadata: Metadata = privateAppPageMetadata(
  'Reports',
  'Generate and review academic, financial, and operational reports.',
  '/reports'
);

export default function PageSeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ReportWorkspace>{children}</ReportWorkspace>;
}
