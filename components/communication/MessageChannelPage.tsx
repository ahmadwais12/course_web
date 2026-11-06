'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import {
  DetailDialog,
  Dropdown,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  RowActions,
  StatCard,
  StatusChip,
  statusToneFromValue,
  TextAreaField,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { AUDIENCES, formatDateTime, type MessageLogRow } from '@/lib/communication';

type Channel = 'sms' | 'email';

const COPY = {
  sms: {
    title: 'SMS',
    description: 'Send SMS messages to students, guardians, and staff and review delivery history.',
    compose: 'Send SMS',
    recipientLabel: 'Phone numbers',
    recipientPlaceholder: '+93700000000, +93790000000',
    recipientHint: 'Separate numbers with commas, spaces, or new lines. Users without a phone are skipped.',
    noun: 'SMS',
  },
  email: {
    title: 'Email',
    description: 'Send emails to students, guardians, and staff and review delivery history.',
    compose: 'Send Email',
    recipientLabel: 'Email addresses',
    recipientPlaceholder: 'name@example.com, other@example.com',
    recipientHint: 'Separate addresses with commas, spaces, or new lines. Users without an email are skipped.',
    noun: 'email',
  },
} as const;

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
];

const AUDIENCE_OPTIONS = [
  { value: '', label: 'No group — only the numbers / addresses below' },
  ...AUDIENCES.map((a) => ({ value: a.value, label: a.label })),
];

function smsSegments(text: string) {
  if (!text) return 0;
  return text.length <= 160 ? 1 : Math.ceil(text.length / 153);
}

export default function MessageChannelPage({ channel }: { channel: Channel }) {
  const copy = COPY[channel];
  const [items, setItems] = useState<MessageLogRow[]>([]);
  const [canSend, setCanSend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [audience, setAudience] = useState('');
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState<MessageLogRow | null>(null);

  const load = useCallback(
    async (soft = false) => {
      if (!soft) setLoading(true);
      try {
        const res = await fetch(`/api/communication/${channel}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Failed to load ${copy.noun} history`);
        setItems(Array.isArray(data.items) ? data.items : []);
        setCanSend(Boolean(data.can_send));
        setError(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : `Failed to load ${copy.noun} history`;
        setError(msg);
        if (!soft) toast.error(msg);
      } finally {
        if (!soft) setLoading(false);
      }
    },
    [channel, copy.noun]
  );

  useEffect(() => {
    load();
  }, [load]);

  useLiveRefresh({ enabled: !showForm, onRefresh: () => load(true) });

  const filterFn = useCallback((item: MessageLogRow) => !status || item.status === status, [status]);

  const list = useListQuery({
    items: items as (MessageLogRow & Record<string, unknown>)[],
    searchKeys: ['recipient', 'subject', 'message', 'sender_name'],
    filterKey: status,
    filterFn: filterFn as (item: MessageLogRow & Record<string, unknown>) => boolean,
  });

  const stats = useMemo(
    () => ({
      total: items.length,
      pending: items.filter((i) => i.status === 'pending').length,
      delivered: items.filter((i) => i.status === 'sent' || i.status === 'delivered' || i.status === 'opened').length,
      failed: items.filter((i) => i.status === 'failed').length,
    }),
    [items]
  );

  const openCompose = () => {
    setAudience('');
    setRecipients('');
    setSubject('');
    setMessage('');
    setFormError(null);
    setShowForm(true);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audience && !recipients.trim()) {
      setFormError('Choose a group or enter at least one recipient');
      return;
    }
    if (channel === 'email' && !subject.trim()) {
      setFormError('Subject is required');
      return;
    }
    if (!message.trim()) {
      setFormError('Message is required');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/communication/${channel}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          channel === 'email'
            ? { audience: audience || null, recipients, subject, body: message }
            : { audience: audience || null, recipients, message }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      const queued = Number(data.queued) || 0;
      const skipped = Number(data.skippedNoContact) || 0;
      toast.success(
        `${queued} ${copy.noun}${queued === 1 ? '' : 's'} saved as pending` +
          (skipped ? ` · ${skipped} user${skipped === 1 ? '' : 's'} skipped (no contact)` : '')
      );
      setShowForm(false);
      await load(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ListPageShell
        title={copy.title}
        description={copy.description}
        primaryAction={canSend ? { label: copy.compose, onClick: openCompose } : undefined}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder={channel === 'sms' ? 'Search number or message…' : 'Search address, subject, or message…'}
        onResetFilters={() => {
          list.reset();
          setStatus('');
        }}
        filters={[{ key: 'status', label: 'Status', value: status, options: STATUS_OPTIONS, onChange: setStatus }]}
        loading={loading}
        columns={[
          { key: 'recipient', header: 'Recipient', render: (r) => <span className="font-semibold">{r.recipient}</span> },
          ...(channel === 'email'
            ? [{ key: 'subject', header: 'Subject', render: (r: MessageLogRow) => r.subject || '—' }]
            : []),
          {
            key: 'message',
            header: 'Message',
            render: (r) => (
              <span className="block max-w-[22rem] truncate" title={r.message}>
                {r.message || '—'}
              </span>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => <StatusChip label={r.status} tone={statusToneFromValue(r.status)} />,
          },
          { key: 'sender_name', header: 'Sent by', render: (r) => r.sender_name || '—' },
          { key: 'created_at', header: 'Date', render: (r) => formatDateTime(r.sent_at || r.created_at) },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (r) => (
              <RowActions
                items={[{ key: 'view', label: 'Details', icon: <Eye size={16} />, onClick: () => setViewing(r) }]}
              />
            ),
          },
        ]}
        rows={list.rows as MessageLogRow[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage={`No ${copy.noun} messages yet.`}
      >
        {error && <ErrorBanner message={error} />}
        <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          No {channel === 'sms' ? 'SMS gateway' : 'email provider'} is connected yet, so messages are saved as{' '}
          <strong>pending</strong> and are not delivered. Connect a provider in System → Integrations to start
          delivery.
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard accent="blue" label="Total" value={stats.total} />
          <StatCard accent="gold" label="Pending" value={stats.pending} />
          <StatCard accent="green" label="Sent / delivered" value={stats.delivered} />
          <StatCard accent="purple" label="Failed" value={stats.failed} />
        </div>
      </ListPageShell>

      <FormDialog
        open={showForm}
        title={copy.compose}
        onClose={() => setShowForm(false)}
        maxWidth="xl"
        footer={
          <FormDialogFooter
            onCancel={() => setShowForm(false)}
            submitLabel="Send"
            submitting={submitting}
            formId={`${channel}-compose-form`}
          />
        }
      >
        <form id={`${channel}-compose-form`} onSubmit={handleSend} className="space-y-4">
          <Dropdown
            label="Send to group"
            value={audience}
            onChange={setAudience}
            options={AUDIENCE_OPTIONS}
            hint="Optional. Sends to every active user in the group who has a contact on file."
          />
          <TextAreaField
            label={copy.recipientLabel}
            rows={3}
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder={copy.recipientPlaceholder}
            hint={copy.recipientHint}
          />
          {channel === 'email' && (
            <InputField label="Subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
          )}
          <TextAreaField
            label="Message"
            required
            rows={channel === 'email' ? 8 : 4}
            maxLength={channel === 'sms' ? 918 : undefined}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            hint={
              channel === 'sms'
                ? `${message.length} characters · ${smsSegments(message)} SMS part${smsSegments(message) === 1 ? '' : 's'}`
                : undefined
            }
          />
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>

      <DetailDialog
        open={Boolean(viewing)}
        title={channel === 'sms' ? 'SMS details' : 'Email details'}
        onClose={() => setViewing(null)}
        rows={
          viewing
            ? [
                { label: 'Recipient', value: viewing.recipient },
                ...(channel === 'email' ? [{ label: 'Subject', value: viewing.subject || '—' }] : []),
                { label: 'Message', value: <span className="whitespace-pre-wrap">{viewing.message}</span> },
                {
                  label: 'Status',
                  value: <StatusChip label={viewing.status} tone={statusToneFromValue(viewing.status)} />,
                },
                { label: 'Sent by', value: viewing.sender_name || '—' },
                { label: 'Date', value: formatDateTime(viewing.sent_at || viewing.created_at) },
              ]
            : []
        }
      />
    </>
  );
}
