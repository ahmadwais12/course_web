import type { MetadataRoute } from 'next';
import { SEO } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SEO.siteName,
    short_name: SEO.siteName,
    description: SEO.defaultDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/logo/dreamflow-icon-filled-256.png',
        sizes: '256x256',
        type: 'image/png',
      },
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
