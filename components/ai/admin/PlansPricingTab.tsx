'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  DataTable,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  PortButton,
  RowActions,
  SectionPanel,
  SegmentedControl,
  StatusChip,
  type DataColumn,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import type { PlanLimitRow, PricingRow } from '@/lib/ai/quota';

type PlanForm = { plan_slug: string; label: string; daily_limit: string; monthly_limit: string; per_minute_limit: string; isNew: boolean };
type PriceForm = { provider: string; model: string; input_per_million: string; output_per_million: string; currency: string; is_active: boolean; isNew: boolean };

const limitText = (v: number | null) => (v === null ? 'Unlimited' : v.toLocaleString());
const str = (v: number | null) => (v === null ? '' : String(v));
const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

export default function PlansPricingTab({ onChanged }: { onChanged?: () => void }) {
  const [plans, setPlans] = useState<PlanLimitRow[]>([]);
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanForm | null>(null);
  const [price, setPrice] = useState<PriceForm | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [p, c] = await Promise.all([
      fetch('/api/ai/admin/plans', { cache: 'no-store' }).then((r) => r.json().then((j) => ({ ok: r.ok, j }))),
      fetch('/api/ai/admin/pricing', { cache: 'no-store' }).then((r) => r.json().then((j) => ({ ok: r.ok, j }))),
    ]).catch(() => [
      { ok: false, j: null },
      { ok: false, j: null },
    ]);
    setLoading(false);
    if (!p.ok || !c.ok) {
      setError(p.j?.error || c.j?.error || 'Failed to load plans and pricing');
      return;
    }
    setPlans(p.j.data ?? []);
    setPricing(c.j.data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const put = async (url: string, body: unknown) => {
    setSaving(true);
    const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      toast.error(json?.error || 'Failed to save');
      return null;
    }
    toast.success('Saved');
    return json;
  };

  const savePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    const json = await put('/api/ai/admin/plans', {
      plan_slug: plan.plan_slug,
      label: plan.label,
      daily_limit: numOrNull(plan.daily_limit),
      monthly_limit: numOrNull(plan.monthly_limit),
      per_minute_limit: numOrNull(plan.per_minute_limit),
    });
    if (json) {
      setPlans(json.data ?? []);
      setPlan(null);
      onChanged?.();
    }
  };

  const savePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price) return;
    const json = await put('/api/ai/admin/pricing', {
      provider: price.provider,
      model: price.model,
      input_per_million: Number(price.input_per_million),
      output_per_million: Number(price.output_per_million),
      currency: price.currency,
      is_active: price.is_active,
    });
    if (json) {
      setPricing(json.data ?? []);
      setPrice(null);
    }
  };

  const planColumns: DataColumn<PlanLimitRow>[] = [
    { key: 'label', header: 'Plan', render: (r) => r.label || r.plan_slug },
    { key: 'plan_slug', header: 'Slug', render: (r) => <code className="text-xs">{r.plan_slug}</code> },
    { key: 'daily_limit', header: 'Daily', align: 'right', render: (r) => limitText(r.daily_limit) },
    { key: 'monthly_limit', header: 'Monthly', align: 'right', render: (r) => limitText(r.monthly_limit) },
    { key: 'per_minute_limit', header: 'Per minute (per user)', align: 'right', render: (r) => limitText(r.per_minute_limit) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <RowActions
          onEdit={() =>
            setPlan({
              plan_slug: r.plan_slug,
              label: r.label ?? r.plan_slug,
              daily_limit: str(r.daily_limit),
              monthly_limit: str(r.monthly_limit),
              per_minute_limit: str(r.per_minute_limit),
              isNew: false,
            })
          }
        />
      ),
    },
  ];

  const priceColumns: DataColumn<PricingRow>[] = [
    { key: 'model', header: 'Model', render: (r) => <code className="text-xs">{r.model}</code> },
    { key: 'provider', header: 'Provider' },
    { key: 'input_per_million', header: 'Input / 1M tokens', align: 'right', render: (r) => `${Number(r.input_per_million)} ${r.currency ?? 'USD'}` },
    { key: 'output_per_million', header: 'Output / 1M tokens', align: 'right', render: (r) => `${Number(r.output_per_million)} ${r.currency ?? 'USD'}` },
    { key: 'is_active', header: 'Status', render: (r) => <StatusChip label={r.is_active === false ? 'inactive' : 'active'} tone={r.is_active === false ? 'gray' : 'green'} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <RowActions
          onEdit={() =>
            setPrice({
              provider: r.provider,
              model: r.model,
              input_per_million: String(Number(r.input_per_million)),
              output_per_million: String(Number(r.output_per_million)),
              currency: r.currency ?? 'USD',
              is_active: r.is_active !== false,
              isNew: false,
            })
          }
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} />}
      <SectionPanel
        title="Plan limits"
        description="AI message limits per subscription plan (matched on the organization’s plan). Organization overrides take priority."
        headerRight={
          <PortButton
            variant="primary"
            onClick={() => setPlan({ plan_slug: '', label: '', daily_limit: '', monthly_limit: '', per_minute_limit: '', isNew: true })}
          >
            <Plus size={15} /> Add plan
          </PortButton>
        }
        bodyClassName="p-0"
      >
        <DataTable columns={planColumns} rows={plans} rowKey={(r) => r.plan_slug} loading={loading} emptyMessage="No plans configured." />
      </SectionPanel>

      <SectionPanel
        title="Model pricing"
        description="Used only to estimate cost in usage reports. Prices are per 1 million tokens — keep them in line with Google’s current price list."
        headerRight={
          <PortButton
            variant="primary"
            onClick={() =>
              setPrice({ provider: 'gemini', model: '', input_per_million: '0', output_per_million: '0', currency: 'USD', is_active: true, isNew: true })
            }
          >
            <Plus size={15} /> Add model price
          </PortButton>
        }
        bodyClassName="p-0"
      >
        <DataTable columns={priceColumns} rows={pricing} rowKey={(r) => `${r.provider}:${r.model}`} loading={loading} emptyMessage="No pricing configured — costs will show as 0." />
      </SectionPanel>

      <FormDialog
        open={Boolean(plan)}
        title={plan?.isNew ? 'Add plan limits' : `Edit plan — ${plan?.label ?? ''}`}
        onClose={() => setPlan(null)}
        footer={<FormDialogFooter onCancel={() => setPlan(null)} submitLabel="Save" submitting={saving} formId="ai-plan-form" />}
      >
        {plan && (
          <form id="ai-plan-form" onSubmit={savePlan} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField
                label="Plan slug"
                value={plan.plan_slug}
                onChange={(e) => setPlan({ ...plan, plan_slug: e.target.value })}
                disabled={!plan.isNew}
                required
                hint="Must match tenants.plan, e.g. basic"
              />
              <InputField label="Label" value={plan.label} onChange={(e) => setPlan({ ...plan, label: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground">Leave a field empty for unlimited.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <InputField label="Daily" type="number" min={0} value={plan.daily_limit} onChange={(e) => setPlan({ ...plan, daily_limit: e.target.value })} />
              <InputField label="Monthly" type="number" min={0} value={plan.monthly_limit} onChange={(e) => setPlan({ ...plan, monthly_limit: e.target.value })} />
              <InputField label="Per minute" type="number" min={0} value={plan.per_minute_limit} onChange={(e) => setPlan({ ...plan, per_minute_limit: e.target.value })} />
            </div>
          </form>
        )}
      </FormDialog>

      <FormDialog
        open={Boolean(price)}
        title={price?.isNew ? 'Add model price' : `Edit price — ${price?.model ?? ''}`}
        onClose={() => setPrice(null)}
        footer={<FormDialogFooter onCancel={() => setPrice(null)} submitLabel="Save" submitting={saving} formId="ai-price-form" />}
      >
        {price && (
          <form id="ai-price-form" onSubmit={savePrice} className="space-y-3">
            <InputField
              label="Model id"
              value={price.model}
              onChange={(e) => setPrice({ ...price, model: e.target.value })}
              disabled={!price.isNew}
              required
              hint="A prefix also matches versioned ids (gemini-2.5-flash matches gemini-2.5-flash-001)."
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <InputField label="Input / 1M" type="number" step="0.0001" min={0} value={price.input_per_million} onChange={(e) => setPrice({ ...price, input_per_million: e.target.value })} required />
              <InputField label="Output / 1M" type="number" step="0.0001" min={0} value={price.output_per_million} onChange={(e) => setPrice({ ...price, output_per_million: e.target.value })} required />
              <InputField label="Currency" value={price.currency} maxLength={3} onChange={(e) => setPrice({ ...price, currency: e.target.value.toUpperCase() })} required />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Active</span>
              <SegmentedControl
                value={price.is_active ? 'on' : 'off'}
                onChange={(v) => setPrice({ ...price, is_active: v === 'on' })}
                options={[
                  { value: 'on', label: 'Active' },
                  { value: 'off', label: 'Inactive' },
                ]}
              />
            </div>
          </form>
        )}
      </FormDialog>
    </div>
  );
}
