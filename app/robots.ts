import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';
import { PRIVATE_APP_PAGES } from '@/lib/seo-pages';

export default function robots(): MetadataRoute.Robots {
  const privatePaths = [
    '/api/',
    '/login',
    ...PRIVATE_APP_PAGES.map((p) => p.path),
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/favicon.ico', '/logo/'],
        disallow: privatePaths,
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/').replace(/\/$/, ''),
  };
}
