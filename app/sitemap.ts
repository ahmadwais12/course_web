import type { MetadataRoute } from 'next';
import { publicBusinessPath } from '@/lib/business-url';
import { listPublicBusinessSlugs } from '@/lib/public-business';
import { absoluteUrl } from '@/lib/seo';

/** Public, canonical, indexable URLs only. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const slugs = await listPublicBusinessSlugs();

  return [
    {
      url: absoluteUrl('/'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/about'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/docs'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/assistant'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: absoluteUrl('/download'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/account-deletion'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    ...slugs.map((slug) => ({
      url: absoluteUrl(publicBusinessPath(slug)),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
