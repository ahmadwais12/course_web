import VerificationSessionsPage from '@/components/verification/VerificationSessionsPage';

type Props = { searchParams: Promise<{ campaign_id?: string }> };

export default async function Page({ searchParams }: Props) {
  const { campaign_id: campaignId } = await searchParams;
  return <VerificationSessionsPage initialCampaignId={campaignId ?? ''} />;
}
