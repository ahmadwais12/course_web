import type { Metadata } from 'next';
import DashboardAuthShell from '@/components/DashboardAuthShell';
import { privateAppPageMetadata } from '@/lib/seo';

/** Authenticated EMIS shell — never index private app routes. */
export const metadata: Metadata = privateAppPageMetadata(
  'App',
  'DreamFlow education management application (private).',
  '/dashboard'
);

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardAuthShell>{children}</DashboardAuthShell>;
}
