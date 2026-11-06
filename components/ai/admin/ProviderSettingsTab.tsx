'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, PlugZap, XCircle } from 'lucide-react';
import {
  Dropdown,
  ErrorBanner,
  InputField,
  PortButton,
  SectionPanel,
  SegmentedControl,
  StatusChip,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import type { AIGlobalSettings } from '@/lib/ai/settings';

type SettingsPayload = {
  settings: AIGlobalSettings;
  providers: { id: string; label: string }[];
  api_key_configured: boolean;
  api_key_env: string;
};

type TestResult = {
  chat?: { ok: boolean; latency_ms?: number; model?: string; error?: string; message?: string };
  embedding?: { ok: boolean; latency_ms?: number; model?: string; error?: string; message?: string };
};

const MODEL_OPTIONS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'].map((m) => ({ value: m, label: m }));
const EMBED_OPTIONS = [{ value: 'gemini-embedding-001', label: 'gemini-embedding-001' }];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <SegmentedControl
      value={value ? 'on' : 'off'}
      onChange={(v) => onChange(v === 'on')}
      options={[
        { value: 'on', label: 'On' },
        { value: 'off', label: 'Off' },
      ]}
    />
  );
}

export default function ProviderSettingsTab() {
  const [payload, setPayload] = useState<SettingsPayload | null>(null);
  const [form, setForm] = useState<AIGlobalSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<TestResult | null>(null);
  const [retention, setRetention] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/ai/admin/settings', { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error || 'Failed to load AI settings');
        return;
      }
      setPayload(json);
      setForm(json.settings);
    })();
  }, []);

  const set = <K extends keyof AIGlobalSettings>(key: K, value: AIGlobalSettings[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const res = await fetch('/api/ai/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      toast.error(json?.error || 'Failed to save');
      return;
    }
    setPayload(json);
    setForm(json.settings);
    toast.success('AI settings saved');
  };

  const runTest = async () => {
    setTesting(true);
    setTest(null);
    const res = await fetch('/api/ai/admin/test', { method: 'POST' });
    const json = await res.json().catch(() => null);
    setTesting(false);
    if (!res.ok) {
      toast.error(json?.error || 'Test failed');
      return;
    }
    setTest(json);
  };

  const runRetention = async () => {
    setRetention(true);
    const res = await fetch('/api/ai/admin/retention', { method: 'POST' });
    const json = await res.json().catch(() => null);
    setRetention(false);
    if (!res.ok) toast.error(json?.error || 'Retention failed');
    else toast.success(`Removed ${json.deleted} old conversation(s)`);
  };

  if (error) return <ErrorBanner message={error} />;
  if (!form || !payload) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <SectionPanel
        title="Provider"
        description="One platform-managed Google Gemini key is shared by all organizations. Organizations never enter their own key."
        headerRight={
          <StatusChip
            label={payload.api_key_configured ? 'API key configured' : 'API key missing'}
            tone={payload.api_key_configured ? 'green' : 'gold'}
          />
        }
      >
        <div className="space-y-4">
          {!payload.api_key_configured && (
            <ErrorBanner
              message={`Set the ${payload.api_key_env} environment variable on the server and restart the app. The key is never stored in the database or shown in the browser.`}
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">AI Assistant (platform-wide)</p>
              <p className="text-xs text-muted-foreground">Turning this off disables the assistant for every organization.</p>
            </div>
            <Toggle value={form.enabled} onChange={(v) => set('enabled', v)} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Dropdown
              label="Provider"
              value={form.provider}
              onChange={(v) => set('provider', v)}
              options={payload.providers.map((p) => ({ value: p.id, label: p.label }))}
            />
            <Dropdown
              label="Chat model"
              value={form.model}
              onChange={(v) => v && set('model', v)}
              options={MODEL_OPTIONS.some((o) => o.value === form.model) ? MODEL_OPTIONS : [...MODEL_OPTIONS, { value: form.model, label: form.model }]}
            />
            <Dropdown
              label="Embedding model"
              value={form.embedding_model}
              onChange={(v) => v && set('embedding_model', v)}
              options={EMBED_OPTIONS}
              hint="768-dimension vectors (must match the database)."
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PortButton variant="secondary" onClick={runTest} disabled={testing || !payload.api_key_configured}>
              <PlugZap size={15} />
              {testing ? 'Testing…' : 'Test connection'}
            </PortButton>
            {test &&
              (['chat', 'embedding'] as const).map((k) =>
                test[k] ? (
                  <span key={k} className="inline-flex items-center gap-1.5 text-sm">
                    {test[k]!.ok ? <CheckCircle2 size={15} className="text-emerald-600" /> : <XCircle size={15} className="text-destructive" />}
                    <span className="capitalize">{k}</span>
                    <span className="text-muted-foreground">
                      {test[k]!.ok ? `${test[k]!.latency_ms} ms` : test[k]!.message || test[k]!.error}
                    </span>
                  </span>
                ) : null
              )}
          </div>
        </div>
      </SectionPanel>

      <SectionPanel title="Generation" description="Applies to every organization.">
        <div className="grid gap-4 md:grid-cols-3">
          <InputField
            label="Temperature (0–1)"
            type="number"
            step="0.05"
            min={0}
            max={1}
            value={form.temperature}
            onChange={(e) => set('temperature', Number(e.target.value))}
            hint="Low values give consistent, factual answers."
          />
          <InputField
            label="Max output tokens"
            type="number"
            min={128}
            max={8192}
            value={form.max_output_tokens}
            onChange={(e) => set('max_output_tokens', Number(e.target.value))}
          />
          <InputField
            label="Thinking budget (tokens)"
            type="number"
            min={0}
            max={8192}
            value={form.thinking_budget ?? ''}
            onChange={(e) => set('thinking_budget', e.target.value === '' ? null : Number(e.target.value))}
            hint="0 = off (cheapest). Empty = model default."
          />
          <InputField
            label="Request timeout (ms)"
            type="number"
            min={5000}
            max={120000}
            value={form.request_timeout_ms}
            onChange={(e) => set('request_timeout_ms', Number(e.target.value))}
          />
          <InputField
            label="Max question length (characters)"
            type="number"
            min={200}
            max={20000}
            value={form.max_input_chars}
            onChange={(e) => set('max_input_chars', Number(e.target.value))}
          />
          <InputField
            label="History messages sent to the model"
            type="number"
            min={2}
            max={40}
            value={form.history_messages}
            onChange={(e) => set('history_messages', Number(e.target.value))}
            hint="Older messages are summarized."
          />
        </div>
      </SectionPanel>

      <SectionPanel title="Capabilities & retention">
        <div className="space-y-4">
          {(
            [
              ['platform_support', 'Platform support (how-to answers)'],
              ['business_data', 'Live business data tools'],
              ['knowledge_base', 'Knowledge base search (RAG)'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-foreground">{label}</p>
              <Toggle
                value={form.capabilities[key]}
                onChange={(v) => set('capabilities', { ...form.capabilities, [key]: v })}
              />
            </div>
          ))}
          <div className="flex flex-wrap items-end gap-3">
            <InputField
              label="Conversation retention (days)"
              type="number"
              min={7}
              max={3650}
              value={form.retention_days}
              onChange={(e) => set('retention_days', Number(e.target.value))}
              containerClassName="w-60"
            />
            <PortButton variant="secondary" onClick={runRetention} disabled={retention}>
              {retention ? 'Cleaning…' : 'Apply retention now'}
            </PortButton>
          </div>
        </div>
      </SectionPanel>

      <div className="flex justify-end">
        <PortButton variant="primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </PortButton>
      </div>
    </div>
  );
}
