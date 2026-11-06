import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'About',
  description:
    'Learn about DreamFlow EMIS — the education platform for institutes, students, staff, and operations.',
  path: '/about',
  keywords: ['DreamFlow', 'about', 'EMIS', 'education management'],
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
