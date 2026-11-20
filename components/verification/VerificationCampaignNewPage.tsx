'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { ErrorBanner, PageHeader, PortButton, SectionPanel } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import CampaignForm, {
  EMPTY_CAMPAIGN,
  type CampaignDraft,
  type CampaignOptions,
  campaignPayload,
} from './CampaignForm';
import { VerificationTabs } from './shared';

export default function VerificationCampaignNewPage() {
  const router = useRouter();
  const [options, setOptions] = useState<CampaignOptions | null>(null);
  const [draft, setDraft] = useState<CampaignDraft>(EMPTY_CAMPAIGN);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/inventory/verification/options', { cache: 'no-store' })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load campaign options');
        setOptions(body as CampaignOptions);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load campaign options'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/inventory/verification/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignPayload(draft)),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not create the campaign');
      toast.success('Campaign created. Branch sessions are ready to assign.');
      router.push(`/inventory/verification/sessions?campaign_id=${body.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the campaign');
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4 animate-fade-up">
      <button
        type="button"
        onClick={() => router.push('/inventory/verification/campaigns')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> All campaigns
      </button>
      <PageHeader
        title="Create verification campaign"
        description="A campaign snapshots the expected assets and generates one verification session per branch."
        actions={
          <PortButton variant="primary" onClick={() => void save()} disabled={saving || loading}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Create campaign
          </PortButton>
        }
      />
      <VerificationTabs />
      {error && <ErrorBanner message={error} />}

      <SectionPanel title="Campaign details" description="Everything here is visible to branch officers in their workspace.">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 size={22} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <CampaignForm draft={draft} onChange={setDraft} options={options} />
          </div>
        )}
      </SectionPanel>

      <div className="flex justify-end gap-2">
        <PortButton variant="ghost" onClick={() => router.push('/inventory/verification/campaigns')} disabled={saving}>
          Cancel
        </PortButton>
        <PortButton variant="primary" onClick={() => void save()} disabled={saving || loading}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Create campaign
        </PortButton>
      </div>
    </div>
  );
}
