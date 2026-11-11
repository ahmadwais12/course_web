import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Admission Waiting List',
  'Open applications still waiting for a visit, decision, or admission.',
  '/admissions/waiting-list'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
