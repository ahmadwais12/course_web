import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return privateAppPageMetadata(
    'Inventory Transactions',
    'Stock in and stock out movements for one inventory item, with export.',
    `/inventory/items/${id}/transactions`
  );
}

export default function PageSeoLayout({ children }: Props) {
  return children;
}
