'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import {
  Dropdown,
  ErrorBanner,
  InputField,
  PageHeader,
  PortButton,
  SectionPanel,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { CAMPAIGN_PRIORITIES } from '@/lib/verification';
import { VerificationTabs } from './shared';

type Settings = {
  require_evidence_for_discrepancy: boolean;
  allow_submit_with_pending: boolean;
  auto_start_session: boolean;
  default_due_days: number;
  default_priority: string;
  notify_on_submit: boolean;
};

const TOGGLES: { key: keyof Settings; label: string; hint: string }[] = [
  {
    key: 'require_evidence_for_discrepancy',
    label: 'Require evidence for discrepancy results',
    hint: 'Officers must upload at least one photo or document before saving Not found, Wrong location, Damaged, Inactive, or Unable results.',
  },
  {
    key: 'allow_submit_with_pending',
    label: 'Allow submitting sessions with pending assets',
    hint: 'When off, a session cannot be submitted until every expected asset has a result.',
  },
  {
    key: 'auto_start_session',
    label: 'Automatically start sessions on first verification',
    hint: 'Saves a step for officers. When off, they must press Start session first.',
  },
  {
    key: 'notify_on_submit',
    label: 'Notify head office when a session is submitted',
    hint: 'Records the submission event in the campaign activity log so reviewers can pick it up.',
  },
];

export default function VerificationSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [manager, setManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/inventory/verification/settings', { cache: 'no-store' }),
      fetch('/api/inventory/verification/options', { cache: 'no-store' }),
    ])
      .then(async ([settingsRes, optionsRes]) => {
        const settingsBody = await settingsRes.json();
        if (!settingsRes.ok) throw new Error(settingsBody.error || 'Failed to load settings');
        const optionsBody = await optionsRes.json();
        if (!optionsRes.ok) throw new Error(optionsBody.error || 'Failed to load access level');
        setSettings(settingsBody as Settings);
        setManager(Boolean(optionsBody.me?.manager));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((current) => (current ? { ...current, [key]: value } : current));

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/inventory/verification/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not save settings');
      setSettings(body as Settings);
      toast.success('Verification settings saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4 animate-fade-up">
      <PageHeader
        title="Verification settings"
        description="Head office controls how physical verification sessions behave."
        actions={
          manager ? (
            <PortButton variant="primary" onClick={() => void save()} disabled={saving || loading}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save settings
            </PortButton>
          ) : undefined
        }
      />
      <VerificationTabs />
      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <Loader2 size={22} className="animate-spin text-muted-foreground" />
        </div>
      ) : settings ? (
        <>
          {!manager && (
            <SectionPanel>
              <p className="p-4 text-sm text-muted-foreground">
                You can view the verification settings, but only head office users can change them.
              </p>
            </SectionPanel>
          )}

          <SectionPanel title="Verification rules" description="Applied to every officer in the workspace.">
            <div className="divide-y divide-border">
              {TOGGLES.map((toggle) => (
                <label key={toggle.key} className="flex cursor-pointer items-start justify-between gap-4 px-4 py-4">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{toggle.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{toggle.hint}</span>
                  </span>
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-[#88b6ff]"
                    checked={Boolean(settings[toggle.key])}
                    disabled={!manager}
                    onChange={(event) =>
                      setSettings((current) => (current ? { ...current, [toggle.key]: event.target.checked } : current))
                    }
                  />
                </label>
              ))}
            </div>
          </SectionPanel>

          <SectionPanel title="Campaign defaults" description="Pre-filled when head office creates a campaign.">
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <InputField
                label="Default due days"
                type="number"
                min={1}
                max={365}
                value={String(settings.default_due_days)}
                disabled={!manager}
                onChange={(event) => set('default_due_days', Number(event.target.value) || 1)}
                hint="Due date is set this many days after the start date."
              />
              <Dropdown
                label="Default priority"
                value={settings.default_priority}
                onChange={(value) => set('default_priority', value)}
                options={CAMPAIGN_PRIORITIES.map((row) => ({ value: row.value, label: row.label }))}
                disabled={!manager}
              />
            </div>
          </SectionPanel>
        </>
      ) : null}
    </div>
  );
}
