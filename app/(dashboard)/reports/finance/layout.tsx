import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Financial Reports',
  'Fee collection, income, expense, outstanding balance, and net position reports.',
  '/reports/finance'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
