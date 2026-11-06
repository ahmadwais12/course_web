'use client';

import React, { useMemo, useState } from 'react';
import {
  DataTable,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  MultiSelectField,
  RowActions,
  SearchBar,
  SectionPanel,
  SegmentedControl,
  StatusChip,
  TextAreaField,
  type DataColumn,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { AI_MODULES, AI_MODULE_LABELS, STAFF_ROLES } from '@/lib/ai/modules';
import type { AITenantSettings } from '@/lib/ai/settings';
import type { QuotaLimits } from '@/lib/ai/quota';

export type AIOrganizationRow = {
  id: string;
  name: string;
  organization_type: string | null;
  is_active: boolean;
  plan: string | null;
  settings: AITenantSettings;
  has_custom_settings: boolean;
  effective_limits: QuotaLimits;
  monthly_used: number;
};

type FormState = {
  enabled: boolean;
  org_admin_can_toggle: boolean;
  org_enabled: boolean;
  monthly_limit: string;
  daily_limit: string;
  per_minute_limit: string;
  allowed_modules: string[];
  allowed_roles: string[];
  warning_threshold: string;
  notes: string;
};

const roleLabel = (r: string) => r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const limitText = (v: number | null) => (v === null ? '∞' : v.toLocaleString());

function toForm(s: AITenantSettings): FormState {
  return {
    enabled: s.enabled,
    org_admin_can_toggle: s.org_admin_can_toggle,
    org_enabled: s.org_enabled,
    monthly_limit: s.monthly_limit?.toString() ?? '',
    daily_limit: s.daily_limit?.toString() ?? '',
    per_minute_limit: s.per_minute_limit?.toString() ?? '',
    allowed_modules: [...s.allowed_modules],
    allowed_roles: s.allowed_roles ? [...s.allowed_roles] : [],
    warning_threshold: String(s.warning_threshold),
    notes: s.notes ?? '',
  };
}

function OnOff({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <SegmentedControl
        value={value ? 'on' : 'off'}
        onChange={(v) => onChange(v === 'on')}
        options={[
          { value: 'on', label: 'On' },
          { value: 'off', label: 'Off' },
        ]}
      />
    </div>
  );
}

export default function OrganizationsTab({
  rows,
  loading,
  error,
  onChanged,
}: {
  rows: AIOrganizationRow[];
  loading: boolean;
  error: string | null;
  onChanged: () => void;
}) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AIOrganizationRow | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q) || (r.plan ?? '').toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const open = (row: AIOrganizationRow) => {
    setEditing(row);
    setForm(toForm(row.settings));
  };
  const close = () => {
    setEditing(null);
    setForm(null);
  };
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !form) return;
    setSaving(true);
    const res = await fetch(`/api/ai/admin/tenants/${editing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        monthly_limit: form.monthly_limit === '' ? null : Number(form.monthly_limit),
        daily_limit: form.daily_limit === '' ? null : Number(form.daily_limit),
        per_minute_limit: form.per_minute_limit === '' ? null : Number(form.per_minute_limit),
        warning_threshold: Number(form.warning_threshold),
        allowed_roles: form.allowed_roles.length ? form.allowed_roles : null,
      }),
    });
    const json = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      toast.error(json?.error || 'Failed to save');
      return;
    }
    toast.success(`AI settings saved for ${editing.name}`);
    close();
    onChanged();
  };

  const columns: DataColumn<AIOrganizationRow>[] = [
    {
      key: 'name',
      header: 'Organization',
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.name}</p>
          <p className="text-xs text-muted-foreground">{r.organization_type ?? '—'}</p>
        </div>
      ),
    },
    { key: 'plan', header: 'Plan', render: (r) => r.plan ?? r.effective_limits.planSlug },
    {
      key: 'status',
      header: 'AI',
      render: (r) => {
        const on = r.settings.enabled && r.settings.org_enabled;
        return (
          <StatusChip
            label={!r.settings.enabled ? 'Disabled by platform' : !r.settings.org_enabled ? 'Off (org admin)' : 'Enabled'}
            tone={on ? 'green' : 'gray'}
          />
        );
      },
    },
    {
      key: 'limits',
      header: 'Daily / Monthly / Per min',
      render: (r) => (
        <span className="tabular-nums">
          {limitText(r.effective_limits.daily)} / {limitText(r.effective_limits.monthly)} / {limitText(r.effective_limits.perMinute)}
          {r.has_custom_settings && (r.settings.daily_limit !== null || r.settings.monthly_limit !== null || r.settings.per_minute_limit !== null) ? (
            <StatusChip label="custom" tone="purple" className="ms-2" />
          ) : null}
        </span>
      ),
    },
    {
      key: 'monthly_used',
      header: 'Used this month',
      align: 'right',
      render: (r) => r.monthly_used.toLocaleString(),
    },
    { key: 'modules', header: 'Modules', render: (r) => `${r.settings.allowed_modules.length} / ${AI_MODULES.length}` },
    { key: 'actions', header: '', align: 'right', render: (r) => <RowActions onEdit={() => open(r)} /> },
  ];

  return (
    <>
      <SectionPanel
        title="Organizations"
        description="Central organizations only — branches share their organization’s AI settings and quota."
        headerRight={<SearchBar value={search} onChange={setSearch} placeholder="Search organizations…" />}
        bodyClassName="p-0"
      >
        {error ? (
          <div className="p-4">
            <ErrorBanner message={error} />
          </div>
        ) : (
          <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} loading={loading} emptyMessage="No organizations found." />
        )}
      </SectionPanel>

      <FormDialog
        open={Boolean(editing && form)}
        title={editing ? `AI settings — ${editing.name}` : 'AI settings'}
        onClose={close}
        maxWidth="2xl"
        footer={<FormDialogFooter onCancel={close} submitLabel="Save" submitting={saving} formId="ai-org-form" />}
      >
        {form && (
          <form id="ai-org-form" onSubmit={submit} className="space-y-4">
            <div className="space-y-3 rounded-xl border border-border p-3">
              <OnOff label="AI Assistant enabled for this organization" value={form.enabled} onChange={(v) => set('enabled', v)} />
              <OnOff label="Organization admin may turn it on/off" value={form.org_admin_can_toggle} onChange={(v) => set('org_admin_can_toggle', v)} />
              <OnOff label="Organization switch (set by org admin)" value={form.org_enabled} onChange={(v) => set('org_enabled', v)} />
            </div>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">
                Leave a limit empty to use the plan default ({editing?.effective_limits.planSlug}). Enter 0 to block.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <InputField label="Daily limit" type="number" min={0} value={form.daily_limit} onChange={(e) => set('daily_limit', e.target.value)} placeholder="Plan default" />
                <InputField label="Monthly limit" type="number" min={0} value={form.monthly_limit} onChange={(e) => set('monthly_limit', e.target.value)} placeholder="Plan default" />
                <InputField label="Per-minute limit (per user)" type="number" min={0} value={form.per_minute_limit} onChange={(e) => set('per_minute_limit', e.target.value)} placeholder="Plan default" />
              </div>
            </div>
            <MultiSelectField
              label="Allowed data modules"
              value={form.allowed_modules}
              onChange={(v) => set('allowed_modules', v)}
              options={AI_MODULES.map((m) => ({ value: m, label: AI_MODULE_LABELS[m] }))}
              hint="Users still only get modules their own role permits."
            />
            <MultiSelectField
              label="Allowed roles"
              value={form.allowed_roles}
              onChange={(v) => set('allowed_roles', v)}
              options={STAFF_ROLES.map((r) => ({ value: r, label: roleLabel(r) }))}
              placeholder="All staff roles"
              clearable
            />
            <InputField
              label="Usage warning threshold (0.1–1)"
              type="number"
              step="0.05"
              min={0.1}
              max={1}
              value={form.warning_threshold}
              onChange={(e) => set('warning_threshold', e.target.value)}
              hint="Users see a near-limit notice above this share of the quota."
            />
            <TextAreaField label="Internal notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} maxLength={1000} />
          </form>
        )}
      </FormDialog>
    </>
  );
}
