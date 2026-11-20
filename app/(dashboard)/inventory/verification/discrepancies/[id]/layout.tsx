import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return privateAppPageMetadata(
    'Verification Discrepancy',
    'Compare expected and actual asset data, review evidence, and approve a discrepancy resolution.',
    `/inventory/verification/discrepancies/${id}`
  );
}

export default function PageSeoLayout({ children }: Props) {
  return children;
}
