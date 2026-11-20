import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

export const metadata: Metadata = privateAppPageMetadata(
  'Physical Verification Workspace',
  'Open an assigned verification session to inspect assets and record physical verification results.',
  '/inventory/verification/workspace'
);

export default function PageSeoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
