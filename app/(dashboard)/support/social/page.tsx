'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ConfirmDialog,
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
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { SOCIAL_PLATFORMS, type SocialRow } from '@/lib/social-links';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function SocialMediaPage() {
  const [items, setItems] = useState<SocialRow[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SocialRow | null>(null);
  const [platform, setPlatform] = useState('');
  const [url, setUrl] = useState('');
  const [order, setOrder] = useState('1');
  const [formStatus, setFormStatus] = useState('active');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<SocialRow | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/support/social', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load social channels');
      setItems(Array.isArray(data.items) ? data.items : []);
      setCanManage(Boolean(data.can_manage));
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load social channels';
      setItems([]);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filterFn = useCallback((item: SocialRow) => !status || item.status === status, [status]);

  const list = useListQuery({
    items: items as (SocialRow & Record<string, unknown>)[],
    searchKeys: ['platform', 'url', 'status'],
    filterKey: status,
    filterFn: filterFn as (item: SocialRow & Record<string, unknown>) => boolean,
  });

  const platformOptions = useMemo(() => {
    const names = new Set<string>([...SOCIAL_PLATFORMS, ...items.map((i) => i.platform).filter(Boolean)]);
    return [...names].map((p) => ({ value: p, label: p }));
  }, [items]);

  const activeCount = items.filter((i) => i.status === 'active').length;

  const openCreate = () => {
    setEditing(null);
    setPlatform('');
    setUrl('');
    setOrder(String(items.reduce((max, i) => Math.max(max, i.display_order), 0) + 1));
    setFormStatus('active');
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (row: SocialRow) => {
    setEditing(row);
    setPlatform(row.platform);
    setUrl(row.url);
    setOrder(String(row.display_order));
    setFormStatus(row.status);
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platform.trim() || !url.trim()) {
      setFormError('Platform and link are required');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(editing ? `/api/support/social/${editing.id}` : '/api/support/social', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, url, display_order: Number(order) || 0, status: formStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success(editing ? 'Social channel updated' : 'Social channel added');
      setShowForm(false);
      await load();
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
      const res = await fetch(`/api/support/social/${deleting.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast.success(`${deleting.platform} removed`);
      setDeleting(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <>
      <ListPageShell
        title="Social Media"
        description="Public social channels for the institute and their status"
        primaryAction={canManage ? { label: 'Add Channel', onClick: openCreate } : undefined}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search platform or link…"
        onResetFilters={() => {
          list.reset();
          setStatus('');
        }}
        filters={[{ key: 'status', label: 'Status', value: status, options: STATUS_OPTIONS, onChange: setStatus }]}
        loading={loading}
        columns={[
          {
            key: 'platform',
            header: 'Platform',
            render: (r) => <span className="font-semibold">{r.platform || '—'}</span>,
          },
          {
            key: 'url',
            header: 'Link',
            render: (r) =>
              r.url ? (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block max-w-[360px] truncate text-primary hover:underline"
                >
                  {r.url}
                </a>
              ) : (
                '—'
              ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => <StatusChip label={r.status} tone={statusToneFromValue(r.status)} />,
          },
          { key: 'display_order', header: 'Order', align: 'right', render: (r) => r.display_order },
          ...(canManage
            ? [
                {
                  key: 'actions',
                  header: 'Actions',
                  align: 'right' as const,
                  render: (r: SocialRow) => (
                    <RowActions onEdit={() => openEdit(r)} onDelete={() => setDeleting(r)} />
                  ),
                },
              ]
            : []),
        ]}
        rows={list.rows as SocialRow[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage={canManage ? 'No social channels yet. Add the first one.' : 'No social channels configured.'}
      >
        {error && <ErrorBanner message={error} />}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard accent="blue" label="Channels" value={items.length} />
          <StatCard accent="green" label="Active" value={activeCount} />
          <StatCard accent="purple" label="Inactive" value={items.length - activeCount} />
        </div>
      </ListPageShell>

      <FormDialog
        open={showForm}
        title={editing ? 'Edit Social Channel' : 'Add Social Channel'}
        onClose={() => setShowForm(false)}
        maxWidth="lg"
        footer={
          <FormDialogFooter
            onCancel={() => setShowForm(false)}
            submitLabel={editing ? 'Save' : 'Add'}
            submitting={submitting}
            formId="social-form"
          />
        }
      >
        <form id="social-form" onSubmit={handleSave} className="space-y-4">
          <Dropdown label="Platform" required value={platform} onChange={setPlatform} options={platformOptions} />
          <InputField
            label="Link"
            required
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://facebook.com/your-page"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              label="Display order"
              type="number"
              min={0}
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              hint="Lower numbers appear first"
            />
            <Dropdown label="Status" value={formStatus} onChange={setFormStatus} options={STATUS_OPTIONS} />
          </div>
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove social channel"
        message={`Remove ${deleting?.platform ?? 'this channel'}? This cannot be undone.`}
        confirmLabel="Remove"
        submitting={deletingBusy}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
