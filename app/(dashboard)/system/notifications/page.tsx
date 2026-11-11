'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Mail, MessageSquare, Smartphone, Sparkles } from 'lucide-react';
import {
  DataTable,
  ErrorBanner,
  Filter,
  PageHeader,
  PortButton,
  SectionPanel,
  Skeleton,
  StatusChip,
  statusToneFromValue,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { dateLabel } from '@/lib/display';

type Settings = Record<string, boolean>;

type TemplateRow = {
  id: string;
  name: string;
  type: string;
  category: string | null;
  subject: string | null;
  body: string;
  isActive: boolean;
  updatedAt: string | null;
};

const CHANNELS = [
  { key: 'email', label: 'Email', hint: 'Send notifications to the user’s email address', icon: Mail },
  { key: 'push', label: 'Push', hint: 'Browser and mobile push notifications', icon: Bell },
  { key: 'sms', label: 'SMS', hint: 'Text messages to the registered mobile number', icon: Smartphone },
  { key: 'inApp', label: 'In-app', hint: 'Show notifications inside the dashboard', icon: Sparkles },
  { key: 'chat', label: 'Chat', hint: 'Direct messages from staff and teachers', icon: MessageSquare },
];

const CATEGORIES = [
  { key: 'academic', label: 'Academic', hint: 'Exams, grades, and enrollment updates' },
  { key: 'payment', label: 'Payments', hint: 'Invoices, receipts, and overdue balances' },
  { key: 'attendance', label: 'Attendance', hint: 'Absence alerts and attendance summaries' },
  { key: 'hr', label: 'HR', hint: 'Leave decisions, payroll, and contracts' },
  { key: 'system', label: 'System', hint: 'Maintenance, security, and account notices' },
  { key: 'marketing', label: 'Marketing', hint: 'Institute news and promotional messages' },
];

const DEFAULTS: Settings = {
  email: true,
  push: true,
  sms: false,
  inApp: true,
  chat: true,
  academic: true,
  payment: true,
  attendance: true,
  hr: true,
  system: true,
  marketing: false,
};

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-muted transition-colors peer-checked:bg-[#88b6ff] peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2" />
        <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export default function NotificationsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/notifications');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load notification settings');
      setSettings({ ...DEFAULTS, ...(data.settings ?? {}) });
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load notification settings';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changed = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(DEFAULTS),
    [settings]
  );

  const visibleTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return templates.filter((row) => {
      if (typeFilter && row.type !== typeFilter) return false;
      if (!query) return true;
      return `${row.name} ${row.subject ?? ''} ${row.category ?? ''} ${row.body}`
        .toLowerCase()
        .includes(query);
    });
  }, [templates, search, typeFilter]);

  const templateTypes = useMemo(
    () =>
      Array.from(new Set(templates.map((row) => row.type).filter(Boolean))).map((type) => ({
        value: type,
        label: type.replaceAll('_', ' '),
      })),
    [templates]
  );

  const save = async () => {
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/system/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: settings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save notification settings');
      toast.success('Notification preferences saved');
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save notification settings';
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4 animate-fade-up">
      <PageHeader
        title="Notifications"
        description="Choose how the institute reaches people and which topics can send alerts."
        pill={loading ? 'LOADING…' : 'LIVE DATA'}
        pillTone={loading ? 'neutral' : 'live'}
        actions={
          <PortButton variant="primary" onClick={() => void save()} disabled={loading || saving}>
            {saving ? 'Saving…' : 'Save preferences'}
          </PortButton>
        }
      />

      {error && <ErrorBanner message={error} />}

      <SectionPanel
        title="Channels"
        description="Delivery methods available for notifications sent from this account."
      >
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {CHANNELS.map((channel) => (
              <ToggleRow
                key={channel.key}
                label={channel.label}
                hint={channel.hint}
                checked={Boolean(settings[channel.key])}
                onChange={(value) =>
                  setSettings((prev) => ({ ...prev, [channel.key]: value }))
                }
              />
            ))}
          </div>
        )}
      </SectionPanel>

      <SectionPanel
        title="Categories"
        description="Topics that are allowed to generate notifications. Turning one off silences it everywhere."
      >
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {CATEGORIES.map((category) => (
              <ToggleRow
                key={category.key}
                label={category.label}
                hint={category.hint}
                checked={Boolean(settings[category.key])}
                onChange={(value) =>
                  setSettings((prev) => ({ ...prev, [category.key]: value }))
                }
              />
            ))}
          </div>
        )}
      </SectionPanel>

      {formError && <ErrorBanner message={formError} />}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-card">
        <span>{changed ? 'You have unsaved changes.' : 'All changes are saved.'}</span>
        <PortButton variant="primary" onClick={() => void save()} disabled={loading || saving}>
          {saving ? 'Saving…' : 'Save preferences'}
        </PortButton>
      </div>

      <SectionPanel
        title="Templates"
        description="Reusable message templates used by the notification engine."
      >
        <div className="mb-4">
          <Filter
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search template name, subject, or body…"
            filters={[
              {
                key: 'type',
                label: 'Type',
                value: typeFilter,
                options: templateTypes,
                onChange: setTypeFilter,
              },
            ]}
            onReset={() => {
              setSearch('');
              setTypeFilter('');
            }}
            description="Filter notification templates by type or text."
          />
        </div>
        <DataTable<TemplateRow>
          loading={loading}
          rows={visibleTemplates}
          rowKey={(row) => row.id}
          emptyMessage="No templates yet. Templates appear here once the notification engine seeds them."
          columns={[
            {
              key: 'name',
              header: 'Template',
              render: (row) => (
                <div>
                  <div className="font-semibold">{row.name}</div>
                  <div className="max-w-[24rem] truncate text-xs text-muted-foreground">
                    {row.subject ?? row.body}
                  </div>
                </div>
              ),
            },
            {
              key: 'type',
              header: 'Type',
              render: (row) => row.type.replaceAll('_', ' '),
            },
            {
              key: 'category',
              header: 'Category',
              render: (row) => (row.category ? row.category.replaceAll('_', ' ') : '—'),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <StatusChip
                  label={row.isActive ? 'active' : 'inactive'}
                  tone={statusToneFromValue(row.isActive ? 'active' : 'inactive')}
                />
              ),
            },
            {
              key: 'updated',
              header: 'Updated',
              render: (row) => dateLabel(row.updatedAt),
            },
          ]}
        />
      </SectionPanel>
    </div>
  );
}
