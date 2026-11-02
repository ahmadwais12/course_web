import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return privateAppPageMetadata(
    'Business Details',
    'View a business profile and manage its branches.',
    `/business/${id}`
  );
}

export default function PageSeoLayout({ children }: Props) {
  return children;
}
