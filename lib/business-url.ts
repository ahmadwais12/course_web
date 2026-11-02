import { PRIVATE_APP_PAGES } from '@/lib/seo-pages';
import { toSlug } from '@/lib/business';

const EXTRA_RESERVED = [
  'login',
  'api',
  'auth',
  'favicon.ico',
  'logo',
  'sitemap.xml',
  'robots.txt',
  'not-found',
  '404',
  'leaves',
  'classes',
  'compliance',
  'hr',
  'create',
  'admin',
  'public',
];

export const RESERVED_BUSINESS_SLUGS = new Set(
  [
    ...EXTRA_RESERVED,
    ...PRIVATE_APP_PAGES.map((page) => page.path.split('/').filter(Boolean)[0] || ''),
  ]
    .map((value) => value.toLowerCase())
    .filter(Boolean)
);

export function publicBusinessPath(slug: string): string {
  return `/${toSlug(slug)}`;
}

export function isReservedBusinessSlug(slug: string): boolean {
  return RESERVED_BUSINESS_SLUGS.has(toSlug(slug));
}

export function publicBusinessUrl(slug: string, origin?: string): string {
  const path = publicBusinessPath(slug);
  if (!origin) return path;
  return `${origin.replace(/\/$/, '')}${path}`;
}
