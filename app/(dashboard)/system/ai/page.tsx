'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ErrorBanner, PageHeader, SegmentedControl } from '@/components/ports';
import AIKnowledgeManager from '@/components/ai/AIKnowledgeManager';
import ProviderSettingsTab from '@/components/ai/admin/ProviderSettingsTab';
import UsageTab from '@/components/ai/admin/UsageTab';
import OrganizationsTab, { type AIOrganizationRow } from '@/components/ai/admin/OrganizationsTab';
import PlansPricingTab from '@/components/ai/admin/PlansPricingTab';

const TABS = [
  { value: 'provider', label: 'Provider' },
  { value: 'usage', label: 'Usage' },
  { value: 'organizations', label: 'Organizations' },
  { value: 'plans', label: 'Plans & Pricing' },
  { value: 'knowledge', label: 'Knowledge Base' },
] as const;
type Tab = (typeof TABS)[number]['value'];

function AIManagementContent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const requested = params.get('tab');
  const tab: Tab = TABS.some((t) => t.value === requested) ? (requested as Tab) : 'provider';

  const [orgs, setOrgs] = useState<AIOrganizationRow[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgsError, setOrgsError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const loadOrgs = useCallback(async () => {
    setOrgsLoading(true);
    setOrgsError(null);
    const res = await fetch('/api/ai/admin/tenants', { cache: 'no-store' });
    const json = await res.json().catch(() => null);
    setOrgsLoading(false);
    if (res.status === 401 || res.status === 403) {
      setForbidden(true);
      return;
    }
    if (!res.ok) {
      setOrgsError(json?.error || 'Failed to load organizations');
      return;
    }
    setOrgs(json.data ?? []);
  }, []);

  useEffect(() => {
    void loadOrgs();
  }, [loadOrgs]);

  const setTab = (next: string) => router.replace(`${pathname}?tab=${next}`, { scroll: false });

  if (forbidden) {
    return (
      <div className="space-y-4">
        <PageHeader title="AI Management" />
        <ErrorBanner message="Only platform administrators can manage the AI Assistant." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Management"
        description="Shared Google Gemini assistant for every organization — one platform-managed key, per-organization limits and isolation."
      />
      <SegmentedControl value={tab} onChange={setTab} options={[...TABS]} />

      {tab === 'provider' && <ProviderSettingsTab />}
      {tab === 'usage' && <UsageTab organizations={orgs.map((o) => ({ id: o.id, name: o.name }))} />}
      {tab === 'organizations' && <OrganizationsTab rows={orgs} loading={orgsLoading} error={orgsError} onChanged={loadOrgs} />}
      {tab === 'plans' && <PlansPricingTab onChanged={loadOrgs} />}
      {tab === 'knowledge' && (
        <AIKnowledgeManager
          scope="global"
          title="Platform knowledge base"
          description="Guides shared with every organization. Built-in guides are generated from the app’s navigation and help content."
          allowBuiltinSync
        />
      )}
    </div>
  );
}

export default function AIManagementPage() {
  return (
    <Suspense fallback={null}>
      <AIManagementContent />
    </Suspense>
  );
}
