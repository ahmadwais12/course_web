'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck, ExternalLink, Trash2 } from 'lucide-react';
import {
  Dropdown,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  PortButton,
  RowActions,
  StatCard,
  StatusChip,
  statusToneFromValue,
  TextAreaField,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useNotifications } from '@/hooks/useNotifications';
import { relativeTime, type AppNotification } from '@/lib/notifications';
import { useListQuery } from '@/hooks/useListQuery';
import { AUDIENCES, PRIORITIES } from '@/lib/communication';

const TYPE_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'academic', label: 'Academic' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'payment', label: 'Payment' },
  { value: 'system', label: 'System' },
];

export default function NotificationsPage() {
  const router = useRouter();
  const { items, unread, loading, error, missingTable, canSend, markRead, markAllRead, refresh } =
    useNotifications({ toastOnInsert: false, limit: 100 });
  const [readFilter, setReadFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [showSend, setShowSend] = useState(false);
  const [audience, setAudience] = useState('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('general');
  const [priority, setPriority] = useState('normal');
  const [actionUrl, setActionUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filterFn = useCallback(
    (item: AppNotification & Record<string, unknown>) => {
      if (readFilter === 'unread' && item.is_read) return false;
      if (readFilter === 'read' && !item.is_read) return false;
      if (typeFilter && item.type !== typeFilter) return false;
      return true;
    },
    [readFilter, typeFilter]
  );

  const list = useListQuery({
    items: items as (AppNotification & Record<string, unknown>)[],
    searchKeys: ['title', 'message', 'type'],
    filterKey: `${readFilter}|${typeFilter}`,
    filterFn,
  });

  const typeOptions = useMemo(() => {
    const known = new Set(TYPE_OPTIONS.map((t) => t.value));
    const extra = [...new Set(items.map((i) => i.type).filter((t) => t && !known.has(t)))];
    return [...TYPE_OPTIONS, ...extra.map((t) => ({ value: t, label: t }))];
  }, [items]);

  const highPriority = items.filter((i) => i.priority === 'high' || i.priority === 'urgent').length;
  const today = items.filter((i) => new Date(i.created_at).toDateString() === new Date().toDateString()).length;

  const openSend = () => {
    setAudience('all');
    setTitle('');
    setMessage('');
    setType('general');
    setPriority('normal');
    setActionUrl('');
    setFormError(null);
    setShowSend(true);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setFormError('Title and message are required');
      return;
    }
    if (actionUrl.trim() && !actionUrl.trim().startsWith('/')) {
      setFormError('Link must be an in-app path starting with "/" (e.g. /payments)');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience,
          title,
          message,
          type,
          priority,
          action_url: actionUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      const sent = Number(data.sent) || 0;
      toast.success(`Notification sent to ${sent} user${sent === 1 ? '' : 's'}`);
      setShowSend(false);
      await refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row: AppNotification) => {
    try {
      const res = await fetch(`/api/notifications/${row.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <>
      <ListPageShell
        title="Notifications"
        description="In-app alerts for your account. History stays here even after realtime toasts."
        pill={unread > 0 ? `${unread} UNREAD` : 'IN-APP'}
        primaryAction={canSend ? { label: 'Send Notification', onClick: openSend } : undefined}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search notifications…"
        onResetFilters={() => {
          list.reset();
          setReadFilter('');
          setTypeFilter('');
        }}
        filters={[
          {
            key: 'read',
            label: 'Status',
            value: readFilter,
            options: [
              { value: 'unread', label: 'Unread' },
              { value: 'read', label: 'Read' },
            ],
            onChange: setReadFilter,
          },
          { key: 'type', label: 'Type', value: typeFilter, options: typeOptions, onChange: setTypeFilter },
        ]}
        loading={loading}
        columns={[
          {
            key: 'title',
            header: 'Notification',
            render: (r) => (
              <div className="min-w-0 max-w-md">
                <div className={r.is_read ? 'text-foreground' : 'font-semibold text-foreground'}>{r.title}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{r.message}</div>
              </div>
            ),
          },
          {
            key: 'type',
            header: 'Type',
            render: (r) => <StatusChip label={r.type || 'general'} tone="blue" />,
          },
          {
            key: 'priority',
            header: 'Priority',
            render: (r) => <StatusChip label={r.priority} tone={statusToneFromValue(r.priority)} />,
          },
          {
            key: 'is_read',
            header: 'Status',
            render: (r) => (
              <StatusChip label={r.is_read ? 'read' : 'unread'} tone={r.is_read ? 'green' : 'gold'} />
            ),
          },
          {
            key: 'created_at',
            header: 'When',
            render: (r) => relativeTime(r.created_at),
          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (r) => (
              <RowActions
                items={[
                  ...(r.is_read
                    ? []
                    : [
                        {
                          key: 'read',
                          label: 'Mark read',
                          icon: <CheckCheck size={16} />,
                          onClick: () => markRead(r.id),
                        },
                      ]),
                  ...(r.action_url
                    ? [
                        {
                          key: 'open',
                          label: 'Open',
                          icon: <ExternalLink size={16} />,
                          onClick: async () => {
                            await markRead(r.id);
                            router.push(r.action_url!);
                          },
                        },
                      ]
                    : []),
                  {
                    key: 'delete',
                    label: 'Delete',
                    icon: <Trash2 size={16} />,
                    danger: true,
                    onClick: () => handleDelete(r),
                  },
                ]}
              />
            ),
          },
        ]}
        rows={list.rows as AppNotification[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage={
          missingTable
            ? 'Notifications table missing. Run migration 20261103_notifications.sql.'
            : 'No notifications yet.'
        }
      >
        {error ? <ErrorBanner message={error} /> : null}
        {missingTable ? (
          <ErrorBanner message="Apply supabase/migrations/20261103_notifications.sql, then refresh." />
        ) : null}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard accent="blue" label="Total" value={items.length} hint="Latest 100" />
          <StatCard accent="gold" label="Unread" value={unread} />
          <StatCard accent="purple" label="High priority" value={highPriority} />
          <StatCard accent="green" label="Today" value={today} />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <PortButton variant="ghost" onClick={() => refresh()} disabled={loading}>
            Refresh
          </PortButton>
          <PortButton variant="secondary" onClick={() => markAllRead()} disabled={unread === 0}>
            Mark all read
          </PortButton>
        </div>
      </ListPageShell>

      <FormDialog
        open={showSend}
        title="Send Notification"
        onClose={() => setShowSend(false)}
        maxWidth="xl"
        footer={
          <FormDialogFooter
            onCancel={() => setShowSend(false)}
            submitLabel="Send"
            submitting={submitting}
            formId="notification-send-form"
          />
        }
      >
        <form id="notification-send-form" onSubmit={handleSend} className="space-y-4">
          <Dropdown
            label="Send to"
            value={audience}
            onChange={setAudience}
            options={AUDIENCES.map((a) => ({ value: a.value, label: a.label }))}
            hint="Every active user in the group gets the notification instantly."
          />
          <InputField label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextAreaField
            label="Message"
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Dropdown label="Type" value={type} onChange={setType} options={TYPE_OPTIONS} />
            <Dropdown
              label="Priority"
              value={priority}
              onChange={setPriority}
              options={PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
            />
          </div>
          <InputField
            label="Link (optional)"
            value={actionUrl}
            onChange={(e) => setActionUrl(e.target.value)}
            placeholder="/payments"
            hint='In-app page opened by the "Open" action.'
          />
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>
    </>
  );
}
