import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return privateAppPageMetadata(
    'Contact info',
    'View contact info, media, links, starred messages, and profile details.',
    `/messaging/${id}`
  );
}

export default function PageSeoLayout({ children }: Props) {
  return children;
}
