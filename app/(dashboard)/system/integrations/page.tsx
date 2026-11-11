'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, PauseCircle, PlayCircle, Plus, Trash2, Webhook } from 'lucide-react';
import {
  DataTable,
  ErrorBanner,
  Filter,
  FormDialog,
  FormDialogFooter,
  InputField,
  MultiSelectField,
  PageHeader,
  PortButton,
  RowActions,
  SectionPanel,
  SegmentedControl,
  StatCard,
  StatusChip,
  statusToneFromValue,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { dateLabel } from '@/lib/display';

type ApiKeyRow = {
  id: string;
  name: string;
  maskedKey: string;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string | null;
};

type WebhookRow = {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  failureCount: number;
};

type IntegrationKind = 'apiKey' | 'webhook';

const EVENT_OPTIONS = [
  { value: 'student.created', label: 'Student created' },
  { value: 'student.updated', label: 'Student updated' },
  { value: 'payment.received', label: 'Payment received' },
  { value: 'invoice.created', label: 'Invoice created' },
  { value: 'attendance.marked', label: 'Attendance marked' },
  { value: 'leave.submitted', label: 'Leave submitted' },
  { value: 'exam.graded', label: 'Exam graded' },
  { value: 'staff.created', label: 'Staff created' },
];

const emptyForm = () => ({
  name: '',
  expiresAt: '',
  url: '',
  events: [] as string[],
});

export default function IntegrationsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<IntegrationKind>('apiKey');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/integrations');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load integrations');
      setApiKeys(Array.isArray(data.apiKeys) ? data.apiKeys : []);
      setWebhooks(Array.isArray(data.webhooks) ? data.webhooks : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load integrations';
      setApiKeys([]);
      setWebhooks([]);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const matches = useCallback(
    (text: string, active: boolean) => {
      const query = search.trim().toLowerCase();
      if (query && !text.toLowerCase().includes(query)) return false;
      if (status && (status === 'active' ? !active : active)) return false;
      return true;
    },
    [search, status]
  );

  const visibleKeys = useMemo(
    () => apiKeys.filter((row) => matches(`${row.name} ${row.maskedKey}`, row.isActive)),
    [apiKeys, matches]
  );
  const visibleHooks = useMemo(
    () => webhooks.filter((row) => matches(`${row.name} ${row.url} ${row.events.join(' ')}`, row.isActive)),
    [webhooks, matches]
  );

  const stats = useMemo(
    () => ({
      keys: apiKeys.length,
      activeKeys: apiKeys.filter((row) => row.isActive).length,
      hooks: webhooks.length,
      failing: webhooks.filter((row) => row.failureCount > 0).length,
    }),
    [apiKeys, webhooks]
  );

  const openCreate = (nextKind: IntegrationKind) => {
    setKind(nextKind);
    setForm(emptyForm());
    setFormError(null);
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Integration name is required');
      return;
    }
    if (kind === 'webhook') {
      if (!/^https?:\/\//i.test(form.url.trim())) {
        setFormError('Webhook URL must start with http:// or https://');
        return;
      }
      if (form.events.length === 0) {
        setFormError('Choose at least one event');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch('/api/system/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create integration');
      toast.success(kind === 'apiKey' ? 'API key created' : 'Webhook created');
      if (kind === 'apiKey' && typeof data.key === 'string') setCreatedKey(data.key);
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create integration');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (table: 'apiKey' | 'webhook', id: string, isActive: boolean) => {
    try {
      const res = await fetch('/api/system/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, table, isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update integration');
      toast.success(isActive ? 'Integration enabled' : 'Integration disabled');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update integration');
    }
  };

  const remove = async (table: 'apiKey' | 'webhook', id: string) => {
    try {
      const res = await fetch(
        `/api/system/integrations?table=${table}&id=${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete integration');
      toast.success('Integration deleted');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete integration');
    }
  };

  const copyKey = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Copy failed — select the key manually');
    }
  };

  return (
    <div className="min-w-0 space-y-4 animate-fade-up">
      <PageHeader
        title="Integrations"
        description="API keys and webhooks that connect the institute to other systems."
        pill={loading ? 'LOADING…' : 'LIVE DATA'}
        pillTone={loading ? 'neutral' : 'live'}
        actions={
          <div className="flex flex-wrap gap-2">
            <PortButton variant="secondary" onClick={() => openCreate('webhook')}>
              <Webhook size={16} /> New webhook
            </PortButton>
            <PortButton variant="primary" onClick={() => openCreate('apiKey')}>
              <Plus size={16} /> New API key
            </PortButton>
          </div>
        }
      />

      {error && <ErrorBanner message={error} />}

      {createdKey && (
        <SectionPanel
          title="New API key created"
          description="Copy this key now — it is only shown once."
        >
          <div className="flex flex-wrap items-center gap-3">
            <code className="min-w-0 flex-1 break-all rounded-xl border border-[#88b6ff]/40 bg-[#88b6ff]/10 px-3 py-2 text-sm font-semibold">
              {createdKey}
            </code>
            <PortButton variant="secondary" onClick={() => void copyKey(createdKey)}>
              <Copy size={16} /> Copy
            </PortButton>
            <PortButton variant="ghost" onClick={() => setCreatedKey(null)}>
              Dismiss
            </PortButton>
          </div>
        </SectionPanel>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="API keys" value={stats.keys} accent="blue" />
        <StatCard label="Active keys" value={stats.activeKeys} accent="green" />
        <StatCard label="Webhooks" value={stats.hooks} accent="gold" />
        <StatCard label="Failing hooks" value={stats.failing} accent="purple" />
      </div>

      <Filter
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, key, URL, or event…"
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: status,
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ],
            onChange: setStatus,
          },
        ]}
        onReset={() => {
          setSearch('');
          setStatus('');
        }}
        description="Filter both API keys and webhooks by name, URL, or status."
      />

      <SectionPanel
        title="API keys"
        description="Server-to-server keys for the public API. Keys are masked after creation."
      >
        <DataTable<ApiKeyRow>
          loading={loading}
          rows={visibleKeys}
          rowKey={(row) => row.id}
          emptyMessage="No API keys yet. Create one to let another system call the API."
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (row) => (
                <div>
                  <div className="font-semibold">{row.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{row.maskedKey}</div>
                </div>
              ),
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
            { key: 'created', header: 'Created', render: (row) => dateLabel(row.createdAt) },
            {
              key: 'expires',
              header: 'Expires',
              render: (row) => (row.expiresAt ? dateLabel(row.expiresAt) : 'Never'),
            },
            {
              key: 'lastUsed',
              header: 'Last used',
              render: (row) => (row.lastUsedAt ? dateLabel(row.lastUsedAt) : '—'),
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (row) => (
                <RowActions
                  overflow={[
                    {
                      key: 'toggle',
                      label: row.isActive ? 'Disable key' : 'Enable key',
                      icon: row.isActive ? <PauseCircle size={16} /> : <PlayCircle size={16} />,
                      onClick: () => void toggle('apiKey', row.id, !row.isActive),
                    },
                    {
                      key: 'delete',
                      label: 'Delete key',
                      icon: <Trash2 size={16} />,
                      onClick: () => void remove('apiKey', row.id),
                      danger: true,
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </SectionPanel>

      <SectionPanel
        title="Webhooks"
        description="Outbound event notifications posted to your endpoints."
      >
        <DataTable<WebhookRow>
          loading={loading}
          rows={visibleHooks}
          rowKey={(row) => row.id}
          emptyMessage="No webhooks yet. Add one to push events to another service."
          columns={[
            {
              key: 'name',
              header: 'Webhook',
              render: (row) => (
                <div>
                  <div className="font-semibold">{row.name}</div>
                  <div className="max-w-[22rem] truncate text-xs text-muted-foreground">{row.url}</div>
                </div>
              ),
            },
            {
              key: 'events',
              header: 'Events',
              render: (row) =>
                row.events.length === 0 ? (
                  '—'
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {row.events.slice(0, 3).map((event) => (
                      <span
                        key={event}
                        className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium"
                      >
                        {event}
                      </span>
                    ))}
                    {row.events.length > 3 && (
                      <span className="text-[11px] text-muted-foreground">
                        +{row.events.length - 3}
                      </span>
                    )}
                  </div>
                ),
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
              key: 'failures',
              header: 'Failures',
              align: 'center',
              render: (row) => (
                <span className={row.failureCount > 0 ? 'font-semibold text-destructive' : ''}>
                  {row.failureCount}
                </span>
              ),
            },
            {
              key: 'last',
              header: 'Last triggered',
              render: (row) => (row.lastTriggeredAt ? dateLabel(row.lastTriggeredAt) : 'Never'),
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (row) => (
                <RowActions
                  overflow={[
                    {
                      key: 'toggle',
                      label: row.isActive ? 'Disable webhook' : 'Enable webhook',
                      icon: row.isActive ? <PauseCircle size={16} /> : <PlayCircle size={16} />,
                      onClick: () => void toggle('webhook', row.id, !row.isActive),
                    },
                    {
                      key: 'delete',
                      label: 'Delete webhook',
                      icon: <Trash2 size={16} />,
                      onClick: () => void remove('webhook', row.id),
                      danger: true,
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </SectionPanel>

      <FormDialog
        open={open}
        title={kind === 'apiKey' ? 'New API key' : 'New webhook'}
        onClose={() => setOpen(false)}
        maxWidth="xl"
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel={kind === 'apiKey' ? 'Create key' : 'Create webhook'}
            submitting={saving}
            formId="integration-form"
          />
        }
      >
        <form id="integration-form" onSubmit={submit} className="space-y-4">
          <SegmentedControl
            value={kind}
            onChange={(value) => {
              setKind(value as IntegrationKind);
              setFormError(null);
            }}
            options={[
              { value: 'apiKey', label: 'API key' },
              { value: 'webhook', label: 'Webhook' },
            ]}
          />
          <InputField
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={kind === 'apiKey' ? 'Reporting service' : 'Billing sync'}
          />
          {kind === 'apiKey' ? (
            <InputField
              label="Expiry date"
              type="date"
              hint="Leave empty for a key that never expires."
              value={form.expiresAt}
              onChange={(e) => setForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
            />
          ) : (
            <>
              <InputField
                label="Endpoint URL"
                required
                type="url"
                value={form.url}
                onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com/hooks/dreamflow"
              />
              <MultiSelectField
                label="Events"
                required
                options={EVENT_OPTIONS}
                value={form.events}
                onChange={(events) => setForm((prev) => ({ ...prev, events }))}
                placeholder="Choose events to send"
                hint="Only the selected events will be posted to the endpoint."
              />
            </>
          )}
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>
    </div>
  );
}
