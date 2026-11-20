import DiscrepancyDetailPage from '@/components/verification/DiscrepancyDetailPage';

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <DiscrepancyDetailPage id={id} />;
}
