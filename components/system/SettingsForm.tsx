'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dropdown,
  ErrorBanner,
  InputField,
  MultiSelectField,
  PageHeader,
  PortButton,
  SectionPanel,
  Skeleton,
  TextAreaField,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';

export type SettingField =
  | {
      key: string;
      label: string;
      type: 'text' | 'email' | 'url' | 'number' | 'textarea';
      placeholder?: string;
      hint?: string;
      required?: boolean;
    }
  | {
      key: string;
      label: string;
      type: 'select';
      options: { value: string; label: string }[];
      hint?: string;
    }
  | {
      key: string;
      label: string;
      type: 'multi';
      options: { value: string; label: string }[];
      hint?: string;
    }
  | { key: string; label: string; type: 'toggle'; hint?: string };

type SettingsValue = string | boolean | string[];
type SettingsState = Record<string, SettingsValue>;

type SettingsFormProps = {
  scope: 'general' | 'finance' | 'academic' | 'localization' | 'languages';
  title: string;
  description: string;
  fields: SettingField[];
  defaults: SettingsState;
  sectionTitle: string;
  sectionDescription?: string;
};

function asText(value: unknown, fallback: string) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return fallback;
}

function buildState(fields: SettingField[], defaults: SettingsState, source: Record<string, unknown>) {
  const next: SettingsState = {};
  for (const field of fields) {
    const fallback = defaults[field.key];
    const value = source[field.key];
    if (field.type === 'toggle') {
      next[field.key] = typeof value === 'boolean' ? value : Boolean(fallback);
    } else if (field.type === 'multi') {
      next[field.key] = Array.isArray(value)
        ? value.map((item) => String(item))
        : Array.isArray(fallback)
          ? fallback
          : [];
    } else {
      next[field.key] = asText(value, typeof fallback === 'string' ? fallback : '');
    }
  }
  return next;
}

/** Shared settings form for the /system section — Ports fields + one save action. */
export default function SettingsForm({
  scope,
  title,
  description,
  fields,
  defaults,
  sectionTitle,
  sectionDescription,
}: SettingsFormProps) {
  const [form, setForm] = useState<SettingsState>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/settings');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load settings');
      const source = (data.settings?.[scope] ?? {}) as Record<string, unknown>;
      setForm(buildState(fields, defaults, source));
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load settings';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
    // fields/defaults are module-level constants on every page — only the scope changes the request
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const changed = useMemo(() => JSON.stringify(form) !== JSON.stringify(defaults), [form, defaults]);

  const update = (key: string, value: SettingsValue) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setFormError(null);
    const required = fields.find((field) => 'required' in field && field.required);
    if (required && !String(form[required.key] ?? '').trim()) {
      setFormError(`${required.label} is required`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/system/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, values: form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      toast.success(`${title} settings saved`);
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save settings';
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4 animate-fade-up">
      <PageHeader
        title={title}
        description={description}
        pill={loading ? 'LOADING…' : 'LIVE DATA'}
        pillTone={loading ? 'neutral' : 'live'}
        actions={
          <PortButton variant="primary" onClick={() => void save()} disabled={loading || saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </PortButton>
        }
      />

      {error && <ErrorBanner message={error} />}

      <SectionPanel title={sectionTitle} description={sectionDescription}>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const value = form[field.key];
              if (field.type === 'textarea') {
                return (
                  <TextAreaField
                    key={field.key}
                    label={field.label}
                    hint={field.hint}
                    className="sm:col-span-2"
                    value={String(value ?? '')}
                    onChange={(e) => update(field.key, e.target.value)}
                    placeholder={field.placeholder}
                  />
                );
              }
              if (field.type === 'select') {
                return (
                  <Dropdown
                    key={field.key}
                    label={field.label}
                    hint={field.hint}
                    value={String(value ?? '')}
                    onChange={(next) => update(field.key, next)}
                    options={field.options}
                  />
                );
              }
              if (field.type === 'multi') {
                return (
                  <MultiSelectField
                    key={field.key}
                    label={field.label}
                    hint={field.hint}
                    value={Array.isArray(value) ? value : []}
                    onChange={(next) => update(field.key, next)}
                    options={field.options}
                    clearable
                  />
                );
              }
              if (field.type === 'toggle') {
                return (
                  <div key={field.key} className="flex flex-col justify-center gap-1.5">
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => update(field.key, e.target.checked)}
                        className="h-4 w-4 rounded border-border"
                      />
                      {field.label}
                    </label>
                    {field.hint && <p className="m-0 text-xs text-muted-foreground">{field.hint}</p>}
                  </div>
                );
              }
              return (
                <InputField
                  key={field.key}
                  label={field.label}
                  type={field.type}
                  required={'required' in field ? field.required : undefined}
                  hint={field.hint}
                  placeholder={field.placeholder}
                  value={String(value ?? '')}
                  onChange={(e) => update(field.key, e.target.value)}
                />
              );
            })}
          </div>
        )}
      </SectionPanel>

      {formError && <ErrorBanner message={formError} />}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-card">
        <span>{changed ? 'You have unsaved changes.' : 'All changes are saved.'}</span>
        <PortButton variant="primary" onClick={() => void save()} disabled={loading || saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </PortButton>
      </div>
    </div>
  );
}
