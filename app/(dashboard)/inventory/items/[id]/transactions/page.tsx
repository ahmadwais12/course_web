import { notFound } from 'next/navigation';
import ItemTransactionsPage from '@/components/inventory/ItemTransactionsPage';
import { getItem } from '@/lib/inventory-store';

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  try {
    await getItem(id);
  } catch {
    notFound();
  }
  return <ItemTransactionsPage itemId={id} />;
}
