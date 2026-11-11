import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';
import { PortalAnnouncementsScreen } from '@/components/portal/PortalSharedScreens';

export const metadata: Metadata = privateAppPageMetadata(
  'Announcements',
  'Class and school announcements for students.',
  '/teacher/announcements'
);

export default function Page() {
  return <PortalAnnouncementsScreen scope="teacher" title="Announcements" description="Class and school announcements for students." canCreate={true} />;
}
