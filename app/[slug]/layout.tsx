import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { buildPageMetadata } from '@/lib/seo';
import { getPublicBusinessBySlug } from '@/lib/public-business';
import { publicBusinessPath } from '@/lib/business-url';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const business = await getPublicBusinessBySlug(slug);
  if (!business) {
    return buildPageMetadata({
      title: 'Business not found',
      description: 'This business page does not exist.',
      path: publicBusinessPath(slug),
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: business.name,
    description:
      business.bio ||
      business.tagline ||
      business.description ||
      `${business.name}${business.business_type_name ? ` · ${business.business_type_name}` : ''} on DreamFlow.`,
    path: publicBusinessPath(business.slug),
    image: business.cover_url || business.logo_url || undefined,
    noIndex: false,
  });
}

export default async function PublicBusinessSeoLayout({ params, children }: Props) {
  const { slug } = await params;
  const business = await getPublicBusinessBySlug(slug);
  if (!business) notFound();
  return children;
}
