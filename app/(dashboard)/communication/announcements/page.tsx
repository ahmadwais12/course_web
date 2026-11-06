'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import {
  ConfirmDialog,
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
import {
  ANNOUNCEMENT_STATUSES,
  ANNOUNCEMENT_TYPES,
  AUDIENCES,
  PRIORITIES,
  audienceLabel,
  formatDateTime,
  type AnnouncementRow,
} from '@/lib/communication';

type FormState = {
  title: string;
  content: string;
  type: string;
  audience: string;
  priority: string;
  status: string;
  is_pinned: string;
  publish_date: string;
  expiry_date: string;
};

const EMPTY_FORM: FormState = {
  title: '',
  content: '',
  type: 'general',
  audience: 'all',
  priority: 'normal',
  status: 'draft',
  is_pinned: 'no',
  publish_date: new Date().toISOString().slice(0, 10),
  expiry_date: '',
};

const YES_NO = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
];

export default function AnnouncementsPage() {
  const [items, setItems] = useState<AnnouncementRow[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [audience, setAudience] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AnnouncementRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState<AnnouncementRow | null>(null);
  const [deleting, setDeleting] = useState<AnnouncementRow | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const load = useCallback(async (soft = false) => {
    if (!soft) setLoading(true);
    try {
      const res = await fetch('/api/communication/announcements', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load announcements');
      setItems(Array.isArray(data.items) ? data.items : []);
      setCanManage(Boolean(data.can_manage));
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load announcements';
      setError(message);
      if (!soft) toast.error(message);
    } finally {
      if (!soft) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useLiveRefresh({ enabled: !showForm, onRefresh: () => load(true) });

  const filterFn = useCallback(
    (item: AnnouncementRow) =>
      (!status || item.status === status) && (!audience || (item.audience || 'all') === audience),
    [status, audience]
  );

  const list = useListQuery({
    items: items as (AnnouncementRow & Record<string, unknown>)[],
    searchKeys: ['title', 'content', 'type', 'created_by_name'],
    filterKey: `${status}|${audience}`,
    filterFn: filterFn as (item: AnnouncementRow & Record<string, unknown>) => boolean,
  });

  const stats = useMemo(
    () => ({
      total: items.length,
      published: items.filter((i) => i.status === 'published').length,
      drafts: items.filter((i) => i.status === 'draft').length,
      pinned: items.filter((i) => i.is_pinned).length,
    }),
    [items]
  );

  const set = (key: keyof FormState) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (row: AnnouncementRow) => {
    setEditing(row);
    setForm({
      title: row.title,
      content: row.content,
      type: row.type,
      audience: row.audience || 'all',
      priority: row.priority,
      status: row.status,
      is_pinned: row.is_pinned ? 'yes' : 'no',
      publish_date: row.publish_date || '',
      expiry_date: row.expiry_date || '',
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setFormError('Title and message are required');
      return;
    }
    if (form.expiry_date && form.publish_date && form.expiry_date < form.publish_date) {
      setFormError('Expiry date must be on or after the publish date');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(
        editing ? `/api/communication/announcements/${editing.id}` : '/api/communication/announcements',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, is_pinned: form.is_pinned === 'yes' }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      const notified = Number(data.notified) || 0;
      toast.success(
        notified > 0
          ? `Announcement published — ${notified} user${notified === 1 ? '' : 's'} notified`
          : editing
            ? 'Announcement updated'
            : 'Announcement saved'
      );
      setShowForm(false);
      await load(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      const res = await fetch(`/api/communication/announcements/${deleting.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast.success('Announcement deleted');
      setDeleting(null);
      await load(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <>
      <ListPageShell
        title="Announcements"
        description="Publish announcements to students, guardians, teachers, and staff. Publishing sends an in-app notification to the audience."
        primaryAction={canManage ? { label: 'New Announcement', onClick: openCreate } : undefined}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search announcements…"
        onResetFilters={() => {
          list.reset();
          setStatus('');
          setAudience('');
        }}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: status,
            options: ANNOUNCEMENT_STATUSES.map((s) => ({ value: s.value, label: s.label })),
            onChange: setStatus,
          },
          {
            key: 'audience',
            label: 'Audience',
            value: audience,
            options: AUDIENCES.map((a) => ({ value: a.value, label: a.label })),
            onChange: setAudience,
          },
        ]}
        loading={loading}
        columns={[
          {
            key: 'title',
            header: 'Announcement',
            render: (r) => (
              <div className="min-w-0 max-w-md">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-foreground">{r.title}</span>
                  {r.is_pinned ? <StatusChip label="pinned" tone="purple" /> : null}
                </div>
                <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{r.content}</div>
              </div>
            ),
          },
          { key: 'audience', header: 'Audience', render: (r) => audienceLabel(r.audience || 'all') },
          { key: 'type', header: 'Type', render: (r) => <span className="capitalize">{r.type}</span> },
          {
            key: 'priority',
            header: 'Priority',
            render: (r) => <StatusChip label={r.priority} tone={statusToneFromValue(r.priority)} />,
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => <StatusChip label={r.status} tone={statusToneFromValue(r.status)} />,
          },
          { key: 'publish_date', header: 'Publish date', render: (r) => r.publish_date || '—' },
          { key: 'created_by_name', header: 'Author', render: (r) => r.created_by_name || '—' },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (r) => (
              <RowActions
                items={[{ key: 'view', label: 'Details', icon: <Eye size={16} />, onClick: () => setViewing(r) }]}
                onEdit={canManage ? () => openEdit(r) : undefined}
                onDelete={canManage ? () => setDeleting(r) : undefined}
              />
            ),
          },
        ]}
        rows={list.rows as AnnouncementRow[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage={canManage ? 'No announcements yet. Create the first one.' : 'No announcements yet.'}
      >
        {error && <ErrorBanner message={error} />}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard accent="blue" label="Total" value={stats.total} />
          <StatCard accent="green" label="Published" value={stats.published} />
          <StatCard accent="gold" label="Drafts" value={stats.drafts} />
          <StatCard accent="purple" label="Pinned" value={stats.pinned} />
        </div>
      </ListPageShell>

      <FormDialog
        open={showForm}
        title={editing ? 'Edit Announcement' : 'New Announcement'}
        onClose={() => setShowForm(false)}
        maxWidth="xl"
        footer={
          <FormDialogFooter
            onCancel={() => setShowForm(false)}
            submitLabel={form.status === 'published' && editing?.status !== 'published' ? 'Publish' : 'Save'}
            submitting={submitting}
            formId="announcement-form"
          />
        }
      >
        <form id="announcement-form" onSubmit={handleSave} className="space-y-4">
          <InputField
            label="Title"
            required
            value={form.title}
            onChange={(e) => set('title')(e.target.value)}
            placeholder="e.g. Final exams schedule"
          />
          <TextAreaField
            label="Message"
            required
            rows={5}
            value={form.content}
            onChange={(e) => set('content')(e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Dropdown
              label="Audience"
              value={form.audience}
              onChange={set('audience')}
              options={AUDIENCES.map((a) => ({ value: a.value, label: a.label }))}
            />
            <Dropdown
              label="Type"
              value={form.type}
              onChange={set('type')}
              options={ANNOUNCEMENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
            <Dropdown
              label="Priority"
              value={form.priority}
              onChange={set('priority')}
              options={PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
            />
            <Dropdown
              label="Status"
              value={form.status}
              onChange={set('status')}
              options={ANNOUNCEMENT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              hint={
                form.status === 'published' && editing?.status !== 'published'
                  ? 'Publishing notifies everyone in the audience.'
                  : undefined
              }
            />
            <InputField
              label="Publish date"
              type="date"
              value={form.publish_date}
              onChange={(e) => set('publish_date')(e.target.value)}
            />
            <InputField
              label="Expiry date"
              type="date"
              value={form.expiry_date}
              onChange={(e) => set('expiry_date')(e.target.value)}
            />
            <Dropdown label="Pin to top" value={form.is_pinned} onChange={set('is_pinned')} options={YES_NO} />
          </div>
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>

      <DetailDialog
        open={Boolean(viewing)}
        title={viewing?.title || 'Announcement'}
        onClose={() => setViewing(null)}
        rows={
          viewing
            ? [
                { label: 'Message', value: <span className="whitespace-pre-wrap">{viewing.content}</span> },
                { label: 'Audience', value: audienceLabel(viewing.audience || 'all') },
                { label: 'Type', value: <span className="capitalize">{viewing.type}</span> },
                {
                  label: 'Priority',
                  value: <StatusChip label={viewing.priority} tone={statusToneFromValue(viewing.priority)} />,
                },
                {
                  label: 'Status',
                  value: <StatusChip label={viewing.status} tone={statusToneFromValue(viewing.status)} />,
                },
                { label: 'Pinned', value: viewing.is_pinned ? 'Yes' : 'No' },
                { label: 'Publish date', value: viewing.publish_date || '—' },
                { label: 'Expiry date', value: viewing.expiry_date || '—' },
                { label: 'Author', value: viewing.created_by_name || '—' },
                { label: 'Created', value: formatDateTime(viewing.created_at) },
                { label: 'Updated', value: formatDateTime(viewing.updated_at) },
              ]
            : []
        }
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete announcement"
        message={`Delete "${deleting?.title ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        submitting={deletingBusy}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
