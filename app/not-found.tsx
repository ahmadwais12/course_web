import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata, SEO } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Page not found',
  description: `The page you requested does not exist on ${SEO.siteName}.`,
  path: '/404',
  noIndex: true,
});

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground px-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground max-w-md">
        This URL is not available. Return to the home page to continue.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Go to home
      </Link>
    </main>
  );
}
