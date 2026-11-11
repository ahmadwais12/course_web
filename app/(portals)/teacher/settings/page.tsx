import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { PortalSettingsScreen } from '@/components/portal/PortalSharedScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Settings',
  'Appearance, language, and account security.',
  '/teacher/settings'
);

export default function Page() {
  return <PortalSettingsScreen scope="teacher" portalName="Teacher" />;
}
