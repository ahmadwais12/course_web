'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  DataTable,
  ErrorBanner,
  MultiSelectField,
  PageHeader,
  PortButton,
  SectionPanel,
  SegmentedControl,
  StatCard,
  StatusChip,
  type DataColumn,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import AIChart from '@/components/ai/AIChart';
import AIKnowledgeManager from '@/components/ai/AIKnowledgeManager';
import { AI_MODULE_LABELS } from '@/lib/ai/modules';

type OrgPayload = {
  organization: { id: string; name: string | null; plan: string | null };
  platform_enabled: boolean;
  settings: {
    enabled: boolean;
    org_enabled: boolean;
    org_admin_can_toggle: boolean;
    allowed_modules: string[];
    allowed_roles: string[] | null;
    warning_threshold: number;
  } | null;
  limits: { daily: number | null; monthly: number | null; perMinute: number | null; planSlug: string };
  usage: { daily: number; monthly: number };
  report: {
    totals: { requests: number; successful: number; failed: number; total_tokens: number };
    by_day: { date: string; requests: number }[];
    by_module: { module: string; requests: number }[];
    top_users: { user_id: string; name: string; requests: number }[];
    feedback: { positive: number; negative: number } | null;
  };
  staff_roles: string[];
};

const roleLabel = (r: string) => r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const limitText = (used: number, limit: number | null) => (limit === null ? `${used} / unlimited` : `${used} / ${limit}`);

export default function AIOrganizationSettingsPage() {
  const [data, setData] = useState<OrgPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch('/api/ai/org', { cache: 'no-store' });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error || 'Failed to load AI settings');
      return;
    }
    setData(json as OrgPayload);
    setRoles((json as OrgPayload).settings?.allowed_roles ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    const res = await fetch('/api/ai/org', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const json = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      toast.error(json?.error || 'Failed to save');
      return;
    }
    toast.success('AI settings saved');
    void load();
  };

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title="AI Settings" description="Organization AI Assistant settings" />
        <ErrorBanner message={error} />
      </div>
    );
  }

  const s = data?.settings;
  const active = Boolean(data?.platform_enabled && s?.enabled && s?.org_enabled);
  const userColumns: DataColumn<OrgPayload['report']['top_users'][number]>[] = [
    { key: 'name', header: 'User' },
    { key: 'requests', header: 'Messages', align: 'right' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Settings"
        description={data?.organization.name ? `AI Assistant for ${data.organization.name}` : 'Organization AI Assistant settings'}
        pill={data ? (active ? 'Enabled' : 'Disabled') : undefined}
        pillTone={active ? 'live' : 'offline'}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Messages today" value={data ? limitText(data.usage.daily, data.limits.daily) : '—'} accent="blue" />
        <StatCard label="Messages this month" value={data ? limitText(data.usage.monthly, data.limits.monthly) : '—'} accent="green" />
        <StatCard label="Plan" value={data?.limits.planSlug ?? '—'} hint="Limits are set by the platform administrator" accent="purple" />
        <StatCard
          label="Feedback"
          value={data?.report.feedback ? `👍 ${data.report.feedback.positive} · 👎 ${data.report.feedback.negative}` : '—'}
          hint="This month"
          accent="gold"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionPanel title="Availability" description="Turn the assistant on or off for your organization.">
          <div className="space-y-4">
            {!data?.platform_enabled && <ErrorBanner message="The platform administrator has turned the AI Assistant off for everyone." />}
            {s && !s.enabled && <ErrorBanner message="The platform administrator has disabled the AI Assistant for your organization." />}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">AI Assistant for staff</p>
                <p className="text-xs text-muted-foreground">
                  {s?.org_admin_can_toggle ? 'You can enable or disable it.' : 'Only the platform administrator can change this.'}
                </p>
              </div>
              <SegmentedControl
                value={s?.org_enabled === false ? 'off' : 'on'}
                onChange={(v) => s?.org_admin_can_toggle && !saving && save({ org_enabled: v === 'on' })}
                options={[
                  { value: 'on', label: 'On' },
                  { value: 'off', label: 'Off' },
                ]}
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enabled data modules</p>
              <div className="flex flex-wrap gap-1.5">
                {(s?.allowed_modules ?? []).map((m) => (
                  <StatusChip key={m} label={AI_MODULE_LABELS[m as keyof typeof AI_MODULE_LABELS] ?? m} tone="blue" />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Each user only sees modules their own role permits (e.g. teachers never see finance).
              </p>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Who can use it" description="Leave empty to allow all staff roles. Students and parents never have access.">
          <div className="space-y-3">
            <MultiSelectField
              label="Allowed roles"
              value={roles}
              onChange={setRoles}
              options={(data?.staff_roles ?? []).filter((r) => r !== 'super_admin').map((r) => ({ value: r, label: roleLabel(r) }))}
              placeholder="All staff roles"
              clearable
            />
            <PortButton variant="primary" disabled={saving || !data} onClick={() => save({ allowed_roles: roles })}>
              {saving ? 'Saving…' : 'Save roles'}
            </PortButton>
          </div>
        </SectionPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionPanel title="Usage this month" description={`${data?.report.totals.requests ?? 0} messages · ${data?.report.totals.failed ?? 0} failed`}>
          {data?.report.by_day.length ? (
            <AIChart
              chart={{
                type: 'bar',
                title: 'Messages per day',
                data: data.report.by_day.map((d) => ({ label: d.date.slice(5), requests: d.requests })),
                series: [{ key: 'requests', label: 'Messages' }],
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No AI usage yet this month.</p>
          )}
        </SectionPanel>
        <SectionPanel title="Most active users" bodyClassName="p-0">
          <DataTable columns={userColumns} rows={data?.report.top_users ?? []} rowKey={(r) => r.user_id} loading={!data} emptyMessage="No usage yet." />
        </SectionPanel>
      </div>

      <AIKnowledgeManager
        scope="organization"
        title="Organization knowledge"
        description="Private documents (policies, procedures, FAQs) only your organization’s assistant can use."
      />
    </div>
  );
}
