import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';
import { PRIVATE_APP_PAGES } from '@/lib/seo-pages';

export default function robots(): MetadataRoute.Robots {
  const privatePaths = [
    '/api/',
    '/login',
    // Prefix entries cover nested private routes (e.g. /business/[id])
    '/business/',
    '/users/',
    '/support/',
    '/messaging/',
    '/observers/',
    '/hr/',
    '/ports/',
    '/organization/',
    '/academic/',
    '/admissions/',
    '/finance/',
    '/inventory/',
    '/communication/',
    '/reports/',
    '/system/',
    '/ai-assistant/',
    '/logs',
    '/trash',
    '/profile',
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
