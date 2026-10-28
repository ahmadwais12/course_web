import type { Metadata } from 'next';
import { APP_NAME } from '@/lib/branding';

/** Production site origin — never use localhost in shipped metadata. */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const vercel = process.env.VERCEL_URL?.trim().replace(/\/$/, '');
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

export const SEO = {
  siteName: APP_NAME,
  defaultTitle: `${APP_NAME} — Education Management Information System`,
  titleTemplate: `%s | ${APP_NAME}`,
  defaultDescription:
    'DreamFlow EMIS helps institutes manage students, courses, attendance, payments, staff, and reports in one secure platform.',
  locale: 'en_US',
  language: 'en',
  /** Default share image (absolute path under /public) */
  defaultOgImagePath: '/logo/dreamflow-icon-filled-256.png',
  twitterHandle: undefined as string | undefined,
} as const;

export function absoluteUrl(path = '/'): string {
  const base = getSiteUrl();
  if (!path || path === '/') return `${base}/`;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function ogImageUrl(path: string = SEO.defaultOgImagePath): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return absoluteUrl(path);
}

type BuildPageMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
  keywords?: string[];
};

/** Private / authenticated app pages — unique title for tabs, always noindex. */
export function privateAppPageMetadata(
  title: string,
  description: string,
  path: string
): Metadata {
  return buildPageMetadata({ title, description, path, noIndex: true });
}

/** Unique page metadata with canonical + Open Graph + Twitter. */
export function buildPageMetadata({
  title,
  description,
  path,
  image = SEO.defaultOgImagePath,
  type = 'website',
  noIndex = false,
  keywords,
}: BuildPageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const imageUrl = ogImageUrl(image);

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: SEO.siteName,
      locale: SEO.locale,
      type,
      images: [{ url: imageUrl, alt: `${SEO.siteName} — ${title}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
      ...(SEO.twitterHandle ? { creator: SEO.twitterHandle } : {}),
    },
  };
}

/** Root layout defaults (title template + metadataBase). */
export function buildRootMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: SEO.defaultTitle,
      template: SEO.titleTemplate,
    },
    description: SEO.defaultDescription,
    applicationName: SEO.siteName,
    authors: [{ name: SEO.siteName }],
    creator: SEO.siteName,
    publisher: SEO.siteName,
    formatDetection: { email: false, address: false, telephone: false },
    icons: {
      icon: [{ url: '/favicon.ico' }, { url: SEO.defaultOgImagePath, type: 'image/png' }],
      apple: [{ url: SEO.defaultOgImagePath }],
    },
    openGraph: {
      title: SEO.defaultTitle,
      description: SEO.defaultDescription,
      url: absoluteUrl('/'),
      siteName: SEO.siteName,
      locale: SEO.locale,
      type: 'website',
      images: [{ url: ogImageUrl(), alt: SEO.siteName }],
    },
    twitter: {
      card: 'summary_large_image',
      title: SEO.defaultTitle,
      description: SEO.defaultDescription,
      images: [ogImageUrl()],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SEO.siteName,
    url: absoluteUrl('/'),
    logo: ogImageUrl(),
    description: SEO.defaultDescription,
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SEO.siteName,
    url: absoluteUrl('/'),
    description: SEO.defaultDescription,
    inLanguage: SEO.language,
    publisher: {
      '@type': 'Organization',
      name: SEO.siteName,
      logo: { '@type': 'ImageObject', url: ogImageUrl() },
    },
  };
}
