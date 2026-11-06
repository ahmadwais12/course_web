'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, MessageSquareReply } from 'lucide-react';
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
import { FEEDBACK_STATUSES, FEEDBACK_TYPES, formatDateTime, type FeedbackRow } from '@/lib/communication';

const RATING_OPTIONS = [
  { value: '', label: 'No rating' },
  { value: '5', label: '★★★★★  Excellent' },
  { value: '4', label: '★★★★  Good' },
  { value: '3', label: '★★★  Okay' },
  { value: '2', label: '★★  Poor' },
  { value: '1', label: '★  Very poor' },
];

const YES_NO = [
  { value: 'no', label: 'No — show my name' },
  { value: 'yes', label: 'Yes — hide my name' },
];

function Stars({ value }: { value: number | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="whitespace-nowrap text-amber-500" aria-label={`${value} out of 5`}>
      {'★'.repeat(value)}
      <span className="text-muted-foreground/40">{'★'.repeat(5 - value)}</span>
    </span>
  );
}

export default function FeedbackPage() {
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [canRespond, setCanRespond] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newType, setNewType] = useState('general');
  const [newRating, setNewRating] = useState('');
  const [newAnonymous, setNewAnonymous] = useState('no');

  const [replying, setReplying] = useState<FeedbackRow | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('reviewed');

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState<FeedbackRow | null>(null);
  const [deleting, setDeleting] = useState<FeedbackRow | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const load = useCallback(async (soft = false) => {
    if (!soft) setLoading(true);
    try {
      const res = await fetch('/api/feedback', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load feedback');
      setItems(Array.isArray(data.items) ? data.items : []);
      setCanRespond(Boolean(data.can_respond));
      setCanDelete(Boolean(data.can_delete));
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load feedback';
      setError(message);
      if (!soft) toast.error(message);
    } finally {
      if (!soft) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useLiveRefresh({ enabled: !showCreate && !replying, onRefresh: () => load(true) });

  const filterFn = useCallback(
    (item: FeedbackRow) =>
      (!status || item.status === status) && (!type || (item.feedback_type || 'general') === type),
    [status, type]
  );

  const list = useListQuery({
    items: items as (FeedbackRow & Record<string, unknown>)[],
    searchKeys: ['from_name', 'title', 'comment', 'response'],
    filterKey: `${status}|${type}`,
    filterFn: filterFn as (item: FeedbackRow & Record<string, unknown>) => boolean,
  });

  const stats = useMemo(() => {
    const rated = items.filter((i) => i.rating);
    const avg = rated.length ? rated.reduce((s, i) => s + (i.rating || 0), 0) / rated.length : 0;
    return {
      total: items.length,
      pending: items.filter((i) => i.status === 'pending').length,
      resolved: items.filter((i) => i.status === 'resolved').length,
      avg: rated.length ? avg.toFixed(1) : '—',
      rated: rated.length,
    };
  }, [items]);

  const openCreate = () => {
    setNewTitle('');
    setNewComment('');
    setNewType('general');
    setNewRating('');
    setNewAnonymous('no');
    setFormError(null);
    setShowCreate(true);
  };

  const openReply = (row: FeedbackRow) => {
    setReplying(row);
    setReplyText(row.response || '');
    setReplyStatus(row.status === 'pending' ? 'reviewed' : row.status);
    setFormError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      setFormError('Please write your feedback');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          comment: newComment,
          feedback_type: newType,
          rating: newRating ? Number(newRating) : null,
          is_anonymous: newAnonymous === 'yes',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      toast.success('Thank you — feedback submitted');
      setShowCreate(false);
      await load(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replying) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/feedback/${replying.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: replyText, status: replyStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success('Feedback updated');
      setReplying(null);
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
      const res = await fetch(`/api/feedback/${deleting.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast.success('Feedback deleted');
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
        title="Feedback"
        description={
          canRespond
            ? 'Feedback from students, guardians, and staff. Reply to close the loop — the author is notified.'
            : 'Share feedback with the institute and see replies to what you sent.'
        }
        primaryAction={{ label: 'Give Feedback', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search feedback…"
        onResetFilters={() => {
          list.reset();
          setStatus('');
          setType('');
        }}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: status,
            options: FEEDBACK_STATUSES.map((s) => ({ value: s.value, label: s.label })),
            onChange: setStatus,
          },
          {
            key: 'type',
            label: 'Type',
            value: type,
            options: FEEDBACK_TYPES.map((t) => ({ value: t.value, label: t.label })),
            onChange: setType,
          },
        ]}
        loading={loading}
        columns={[
          {
            key: 'title',
            header: 'Feedback',
            render: (r) => (
              <div className="min-w-0 max-w-md">
                <div className="truncate font-semibold text-foreground">{r.title || 'Untitled'}</div>
                <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{r.comment}</div>
              </div>
            ),
          },
          { key: 'from_name', header: 'From', render: (r) => r.from_name },
          {
            key: 'feedback_type',
            header: 'Type',
            render: (r) => <span className="capitalize">{r.feedback_type || 'general'}</span>,
          },
          { key: 'rating', header: 'Rating', render: (r) => <Stars value={r.rating} /> },
          {
            key: 'status',
            header: 'Status',
            render: (r) => <StatusChip label={r.status} tone={statusToneFromValue(r.status)} />,
          },
          { key: 'created_at', header: 'Date', render: (r) => formatDateTime(r.created_at) },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (r) => (
              <RowActions
                items={[
                  { key: 'view', label: 'Details', icon: <Eye size={16} />, onClick: () => setViewing(r) },
                  ...(canRespond
                    ? [
                        {
                          key: 'reply',
                          label: 'Reply',
                          icon: <MessageSquareReply size={16} />,
                          onClick: () => openReply(r),
                        },
                      ]
                    : []),
                ]}
                onDelete={canDelete ? () => setDeleting(r) : undefined}
              />
            ),
          },
        ]}
        rows={list.rows as FeedbackRow[]}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No feedback yet."
      >
        {error && <ErrorBanner message={error} />}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard accent="blue" label="Total" value={stats.total} />
          <StatCard accent="gold" label="Pending" value={stats.pending} />
          <StatCard accent="green" label="Resolved" value={stats.resolved} />
          <StatCard
            accent="purple"
            label="Average rating"
            value={stats.avg}
            hint={`${stats.rated} rated`}
          />
        </div>
      </ListPageShell>

      <FormDialog
        open={showCreate}
        title="Give Feedback"
        onClose={() => setShowCreate(false)}
        maxWidth="lg"
        footer={
          <FormDialogFooter
            onCancel={() => setShowCreate(false)}
            submitLabel="Submit"
            submitting={submitting}
            formId="feedback-create-form"
          />
        }
      >
        <form id="feedback-create-form" onSubmit={handleCreate} className="space-y-4">
          <InputField
            label="Subject"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Classroom temperature"
          />
          <TextAreaField
            label="Your feedback"
            required
            rows={5}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Dropdown
              label="Type"
              value={newType}
              onChange={setNewType}
              options={FEEDBACK_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
            <Dropdown label="Rating" value={newRating} onChange={setNewRating} options={RATING_OPTIONS} />
          </div>
          <Dropdown label="Send anonymously" value={newAnonymous} onChange={setNewAnonymous} options={YES_NO} />
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>

      <FormDialog
        open={Boolean(replying)}
        title="Reply to feedback"
        onClose={() => setReplying(null)}
        maxWidth="lg"
        footer={
          <FormDialogFooter
            onCancel={() => setReplying(null)}
            submitLabel="Save reply"
            submitting={submitting}
            formId="feedback-reply-form"
          />
        }
      >
        {replying && (
          <form id="feedback-reply-form" onSubmit={handleReply} className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-semibold">{replying.title || 'Untitled'}</span>
                <Stars value={replying.rating} />
              </div>
              <p className="m-0 whitespace-pre-wrap text-muted-foreground">{replying.comment}</p>
              <p className="m-0 mt-2 text-xs text-muted-foreground">
                {replying.from_name} · {formatDateTime(replying.created_at)}
              </p>
            </div>
            <TextAreaField
              label="Reply"
              rows={4}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              hint={replying.user_id ? 'The author gets an in-app notification with your reply.' : undefined}
            />
            <Dropdown
              label="Status"
              value={replyStatus}
              onChange={setReplyStatus}
              options={FEEDBACK_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
            />
            {formError && <ErrorBanner message={formError} />}
          </form>
        )}
      </FormDialog>

      <DetailDialog
        open={Boolean(viewing)}
        title={viewing?.title || 'Feedback'}
        onClose={() => setViewing(null)}
        rows={
          viewing
            ? [
                { label: 'From', value: viewing.from_name },
                { label: 'Type', value: <span className="capitalize">{viewing.feedback_type || 'general'}</span> },
                { label: 'Rating', value: <Stars value={viewing.rating} /> },
                {
                  label: 'Status',
                  value: <StatusChip label={viewing.status} tone={statusToneFromValue(viewing.status)} />,
                },
                { label: 'Feedback', value: <span className="whitespace-pre-wrap">{viewing.comment}</span> },
                {
                  label: 'Reply',
                  value: viewing.response ? (
                    <span className="whitespace-pre-wrap">{viewing.response}</span>
                  ) : (
                    'No reply yet'
                  ),
                },
                { label: 'Replied by', value: viewing.responded_by_name || '—' },
                { label: 'Replied at', value: formatDateTime(viewing.responded_at) },
                { label: 'Submitted', value: formatDateTime(viewing.created_at) },
              ]
            : []
        }
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete feedback"
        message="Delete this feedback? This cannot be undone."
        confirmLabel="Delete"
        submitting={deletingBusy}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
