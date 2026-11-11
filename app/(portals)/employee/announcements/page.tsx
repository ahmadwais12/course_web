import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { PortalAnnouncementsScreen } from '@/components/portal/PortalSharedScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Announcements',
  'School announcements published for staff.',
  '/employee/announcements'
);

export default function Page() {
  return <PortalAnnouncementsScreen scope="employee" title="Announcements" description="School announcements published for staff." canCreate={false} />;
}
