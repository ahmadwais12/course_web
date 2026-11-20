'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import {
  Dropdown,
  ErrorBanner,
  InputField,
  PageHeader,
  PortButton,
  SectionPanel,
  StatusChip,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';

type SecuritySettings = {
  two_factor_required: boolean;
  require_delete_confirmation: boolean;
  session_timeout_minutes: number;
  backup_reminder_days: number;
};

const BOOL_OPTIONS = [
  { value: 'yes', label: 'Enabled' },
  { value: 'no', label: 'Disabled' },
];

export default function SecurityPage() {
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [form, setForm] = useState({
    two_factor_required: 'no',
    require_delete_confirmation: 'yes',
    session_timeout_minutes: '30',
    backup_reminder_days: '7',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/security');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load security settings');
      setSettings(data);
      setForm({
        two_factor_required: data.two_factor_required ? 'yes' : 'no',
        require_delete_confirmation: data.require_delete_confirmation ? 'yes' : 'no',
        session_timeout_minutes: String(data.session_timeout_minutes ?? 30),
        backup_reminder_days: String(data.backup_reminder_days ?? 7),
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load security settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/inventory/security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          two_factor_required: form.two_factor_required === 'yes',
          require_delete_confirmation: form.require_delete_confirmation === 'yes',
          session_timeout_minutes: Number(form.session_timeout_minutes) || 30,
          backup_reminder_days: Number(form.backup_reminder_days) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSettings(data);
      toast.success('Security policy saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Two-factor Security"
        description="Inventory security policy for sign-in, deletions, session length, and backup reminders."
        pill="SECURITY POLICY"
        pillTone={settings?.two_factor_required ? 'live' : 'neutral'}
      />

      {error && <ErrorBanner message={error} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
          <Shield size={18} />
          <span className="text-sm font-semibold">Two-factor</span>
          <StatusChip
            tone={settings?.two_factor_required ? 'green' : 'gray'}
            label={settings?.two_factor_required ? 'Required' : 'Optional'}
          />
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
          <span className="text-sm font-semibold">Session timeout</span>
          <StatusChip tone="blue" label={`${settings?.session_timeout_minutes ?? 30} min`} />
        </div>
      </div>

      <SectionPanel
        title="Policy"
        description="These controls record the inventory policy. Enforcement of two-factor sign-in is handled by the identity provider."
      >
        <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
          <Dropdown
            label="Require two-factor authentication"
            value={form.two_factor_required}
            onChange={(value) => setForm({ ...form, two_factor_required: value })}
            options={BOOL_OPTIONS}
          />
          <Dropdown
            label="Confirm before deleting records"
            value={form.require_delete_confirmation}
            onChange={(value) => setForm({ ...form, require_delete_confirmation: value })}
            options={BOOL_OPTIONS}
          />
          <InputField
            label="Session timeout (minutes)"
            type="number"
            min={5}
            step="1"
            value={form.session_timeout_minutes}
            onChange={(e) => setForm({ ...form, session_timeout_minutes: e.target.value })}
            hint="Between 5 and 240 minutes."
          />
          <InputField
            label="Backup reminder (days)"
            type="number"
            min={0}
            step="1"
            value={form.backup_reminder_days}
            onChange={(e) => setForm({ ...form, backup_reminder_days: e.target.value })}
            hint="0 turns the reminder off."
          />
          <div className="sm:col-span-2">
            <PortButton variant="primary" onClick={save} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save security policy'}
            </PortButton>
          </div>
        </div>
      </SectionPanel>
    </div>
  );
}
