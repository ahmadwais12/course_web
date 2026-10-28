import type { Metadata } from 'next';
import LandingPageClient from '@/components/landing/LandingPageClient';
import JsonLd from '@/components/seo/JsonLd';
import { 
  buildPageMetadata,
  organizationJsonLd,
  websiteJsonLd,
} from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Education Management Information System',
  description:
    'DreamFlow EMIS streamlines institute administration — students, courses, attendance, payments, staff, and reports in one secure platform.',
  path: '/',
  keywords: [
    'DreamFlow',
    'EMIS',
    'education management',
    'school management system',
    'student information system',
    'institute software',
  ],
});

export default function HomePage() {
  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <LandingPageClient />
    </>
  );
}
