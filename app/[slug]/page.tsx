import { notFound } from 'next/navigation';
import { Globe, Mail, MapPin, Phone } from 'lucide-react';
import JsonLd from '@/components/seo/JsonLd';
import { PageHeader, SectionPanel, StatusChip } from '@/components/ports';
import { getPublicBusinessBySlug } from '@/lib/public-business';
import { publicBusinessPath } from '@/lib/business-url';
import { absoluteUrl } from '@/lib/seo';
import { coverUrlFromRow } from '@/lib/business';
import SignInAction from './SignInAction';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PublicBusinessPage({ params }: Props) {
  const { slug } = await params;
  const business = await getPublicBusinessBySlug(slug);
  if (!business) notFound();

  const path = publicBusinessPath(business.slug);
  const cover = coverUrlFromRow(business);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: business.name,
          url: absoluteUrl(path),
          description: business.bio || business.description || undefined,
          email: business.email || undefined,
          telephone: business.phone || undefined,
          address: business.address || undefined,
          logo: business.logo_url || undefined,
          image: cover || undefined,
        }}
      />

      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="h-56 w-full object-cover sm:h-72" />
      )}

      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:px-6">
        <PageHeader
          title={business.name}
          description={
            business.tagline ||
            [business.business_type_name, business.city, business.country].filter(Boolean).join(' · ') ||
            'Business'
          }
          pill={business.tenant_code || 'LIVE'}
          pillTone="live"
          actions={<SignInAction />}
        />

        <SectionPanel
          title="About"
          description={business.plan ? `${business.plan} plan` : undefined}
          headerRight={
            <StatusChip
              label={business.is_active ? 'active' : 'inactive'}
              tone={business.is_active ? 'green' : 'purple'}
            />
          }
        >
          <div className="flex flex-wrap items-start gap-4">
            {business.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logo_url}
                alt={`${business.name} logo`}
                className="h-20 w-20 rounded-xl border border-border object-cover"
              />
            )}
            <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {business.bio || business.description || 'No bio has been added yet.'}
            </p>
          </div>
        </SectionPanel>

        <SectionPanel title="Contact">
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
            <li className="flex items-center gap-2 text-sm">
              <Mail size={16} className="text-muted-foreground" />
              {business.email || '—'}
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Phone size={16} className="text-muted-foreground" />
              {business.phone || '—'}
            </li>
            <li className="flex items-center gap-2 text-sm sm:col-span-2">
              <MapPin size={16} className="text-muted-foreground" />
              {[business.address, business.city, business.country].filter(Boolean).join(', ') || '—'}
            </li>
            {business.website && (
              <li className="flex items-center gap-2 text-sm sm:col-span-2">
                <Globe size={16} className="text-muted-foreground" />
                <a href={business.website} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                  {business.website}
                </a>
              </li>
            )}
            {business.working_hours_display && (
              <li className="text-sm sm:col-span-2">
                <span className="text-muted-foreground">Hours: </span>
                {business.working_hours_display}
              </li>
            )}
          </ul>
        </SectionPanel>

        {(business.services || []).length > 0 && (
          <SectionPanel title="Services">
            <p className="m-0 text-sm">{business.services?.join(', ')}</p>
          </SectionPanel>
        )}
      </div>
    </div>
  );
}
