'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, FileText, Loader2, MessageSquarePlus, Paperclip, UserCheck, XCircle } from 'lucide-react';
import {
  Dropdown,
  ErrorBanner,
  FormDialog,
  PageHeader,
  PortButton,
  SectionPanel,
  StatusChip,
  TextAreaField,
  statusToneFromValue,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import {
  CAMPAIGN_PRIORITIES,
  DISCREPANCY_STATUSES,
  DISCREPANCY_TYPES,
  PHYSICAL_CONDITIONS,
  VERIFY_RESULTS,
  labelFrom,
} from '@/lib/verification';
import { VerificationTabs, shortDate, timestamp } from './shared';

type Discrepancy = {
  id: string;
  code: string;
  session_id: string;
  branch_name: string;
  asset_id: string;
  asset_code: string;
  asset_name: string;
  type: string;
  description: string;
  priority: string;
  status: string;
  reported_by_name: string;
  reported_at: string;
  assigned_reviewer_id: string | null;
  assigned_reviewer_name: string;
  notes: { text: string; by: string; at: string }[];
  resolution: string;
  resolved_by_name: string;
  resolved_at: string | null;
  approved_by_name: string;
  approved_at: string | null;
};

type Item = {
  id: string;
  asset_code: string;
  asset_name: string;
  serial_number: string;
  holder_name: string;
  expected_branch: string;
  expected_department: string;
  expected_location: string;
  expected_status: string;
  expected_condition: string;
  result: string;
  actual_branch: string;
  actual_department: string;
  actual_location: string;
  actual_condition: string;
  notes: string;
  verified_by_name: string;
  verified_at: string | null;
};

type Evidence = {
  id: string;
  file_name: string;
  file_type: string;
  uploaded_by_name: string;
  created_at: string;
  url: string;
};

type Activity = { id: string; action: string; detail: string; actor_name: string; created_at: string };

type Detail = {
  discrepancy: Discrepancy;
  session: { id: string; code: string; branch_name: string; province: string; country: string; status: string };
  item: Item | null;
  evidence: Evidence[];
  activity: Activity[];
};

type Options = {
  me: { id: string; name: string; manager: boolean };
  officers: { value: string; label: string }[];
};

type DialogKind = 'assign' | 'note' | 'resolve' | null;

export default function DiscrepancyDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [options, setOptions] = useState<Options | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [text, setText] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [detailRes, optionsRes] = await Promise.all([
        fetch(`/api/inventory/verification/discrepancies/${id}`, { cache: 'no-store' }),
        fetch('/api/inventory/verification/options', { cache: 'no-store' }),
      ]);
      const detailBody = await detailRes.json();
      if (!detailRes.ok) throw new Error(detailBody.error || 'Failed to load the discrepancy');
      const optionsBody = await optionsRes.json();
      if (!optionsRes.ok) throw new Error(optionsBody.error || 'Failed to load reviewers');
      setData(detailBody as Detail);
      setOptions({ me: optionsBody.me, officers: optionsBody.officers ?? [] });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the discrepancy');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (action: string, payload: Record<string, unknown> = {}) => {
    setBusy(action);
    try {
      const res = await fetch(`/api/inventory/verification/discrepancies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not update the discrepancy');
      toast.success('Discrepancy updated');
      setDialog(null);
      setText('');
      setReviewer('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update the discrepancy');
    } finally {
      setBusy(null);
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length || !data) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set('file', file);
        form.set('session_id', data.discrepancy.session_id);
        form.set('discrepancy_id', data.discrepancy.id);
        const res = await fetch('/api/inventory/verification/uploads', { method: 'POST', body: form });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `Could not upload ${file.name}`);
      }
      toast.success('Evidence added');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not upload evidence');
    } finally {
      setUploading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 size={22} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <VerificationTabs />
        <ErrorBanner message={error ?? 'Discrepancy not found.'} />
        <PortButton onClick={() => router.push('/inventory/verification/discrepancies')}>Back to discrepancies</PortButton>
      </div>
    );
  }

  const row = data.discrepancy;
  const item = data.item;
  const manager = options?.me.manager ?? false;
  const active = !['approved', 'rejected', 'closed'].includes(row.status);

  return (
    <div className="min-w-0 space-y-4 animate-fade-up">
      <button
        type="button"
        onClick={() => router.push('/inventory/verification/discrepancies')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> All discrepancies
      </button>

      <PageHeader
        title={`${row.code} · ${row.asset_name}`}
        description={`${row.branch_name} · reported by ${row.reported_by_name} on ${shortDate(row.reported_at)}`}
        pill={labelFrom(DISCREPANCY_STATUSES, row.status, row.status).toUpperCase()}
        pillTone={row.status === 'approved' ? 'live' : 'neutral'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {manager && active ? (
              <PortButton variant="secondary" onClick={() => setDialog('assign')}>
                <UserCheck size={15} /> Assign reviewer
              </PortButton>
            ) : null}
            {active ? (
              <PortButton variant="ghost" onClick={() => setDialog('note')}>
                <MessageSquarePlus size={15} /> Add note
              </PortButton>
            ) : null}
            {row.status !== 'closed' && row.status !== 'approved' ? (
              <PortButton variant="primary" onClick={() => setDialog('resolve')}>
                Resolve
              </PortButton>
            ) : null}
            {manager && ['awaiting_approval', 'resolved', 'under_investigation'].includes(row.status) ? (
              <>
                <PortButton variant="secondary" onClick={() => void act('reject')} disabled={busy !== null}>
                  <XCircle size={15} /> Reject
                </PortButton>
                <PortButton variant="primary" onClick={() => void act('approve')} disabled={busy !== null}>
                  <CheckCircle2 size={15} /> Approve
                </PortButton>
              </>
            ) : null}
            {manager && row.status === 'approved' ? (
              <PortButton variant="secondary" onClick={() => void act('close')} disabled={busy !== null}>
                Close discrepancy
              </PortButton>
            ) : null}
          </div>
        }
      />
      <VerificationTabs />
      {error && <ErrorBanner message={error} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionPanel title="Discrepancy" className="lg:col-span-2">
          <dl className="grid gap-3 p-4 sm:grid-cols-2">
            <Field label="Type" value={labelFrom(DISCREPANCY_TYPES, row.type, row.type)} />
            <Field label="Priority" value={row.priority} />
            <Field label="Status" value={labelFrom(DISCREPANCY_STATUSES, row.status, row.status)} />
            <Field label="Assigned reviewer" value={row.assigned_reviewer_name || 'Unassigned'} />
            <Field label="Description" value={row.description} className="sm:col-span-2" />
            {row.resolution ? <Field label="Resolution" value={row.resolution} className="sm:col-span-2" /> : null}
            {row.resolved_at ? (
              <Field label="Resolved" value={`${row.resolved_by_name} · ${timestamp(row.resolved_at)}`} />
            ) : null}
            {row.approved_at ? (
              <Field label="Approved / rejected" value={`${row.approved_by_name} · ${timestamp(row.approved_at)}`} />
            ) : null}
          </dl>
        </SectionPanel>

        <SectionPanel title="Session">
          <dl className="grid gap-3 p-4">
            <Field label="Session" value={data.session.code} />
            <Field label="Branch" value={data.session.branch_name} />
            <Field label="Location" value={[data.session.province, data.session.country].filter(Boolean).join(', ')} />
            <Field label="Session status" value={data.session.status.replace(/_/g, ' ')} />
            <PortButton variant="secondary" onClick={() => router.push(`/inventory/verification/sessions/${data.session.id}`)}>
              Open workspace
            </PortButton>
          </dl>
        </SectionPanel>
      </div>

      {item && (
        <SectionPanel title="Expected vs actual" description="Recorded by the verification officer. Official records are not changed automatically.">
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border">
              <p className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Expected
              </p>
              <dl className="grid gap-2 p-3 text-sm">
                <Field label="Branch" value={item.expected_branch} />
                <Field label="Department" value={item.expected_department} />
                <Field label="Location" value={item.expected_location} />
                <Field label="Status" value={item.expected_status} />
                <Field label="Condition" value={item.expected_condition} />
                <Field label="Custodian" value={item.holder_name} />
              </dl>
            </div>
            <div className="rounded-xl border border-border">
              <p className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Actual
              </p>
              <dl className="grid gap-2 p-3 text-sm">
                <Field label="Result" value={labelFrom(VERIFY_RESULTS, item.result, item.result)} />
                <Field label="Branch" value={item.actual_branch} />
                <Field label="Department" value={item.actual_department} />
                <Field label="Location" value={item.actual_location} />
                <Field
                  label="Condition"
                  value={item.actual_condition ? labelFrom(PHYSICAL_CONDITIONS, item.actual_condition, item.actual_condition) : ''}
                />
                <Field label="Serial" value={item.serial_number} />
                <Field label="Notes" value={item.notes} />
                <Field label="Verified" value={item.verified_at ? `${item.verified_by_name} · ${timestamp(item.verified_at)}` : ''} />
              </dl>
            </div>
          </div>
        </SectionPanel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionPanel
          title="Evidence"
          description={`${data.evidence.length} file${data.evidence.length === 1 ? '' : 's'}`}
          headerRight={
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[7px] border border-border bg-card px-2.5 py-1.5 text-xs font-semibold hover:bg-muted">
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />} Add evidence
              <input
                type="file"
                className="hidden"
                multiple
                accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                disabled={uploading}
                onChange={(event) => {
                  void upload(event.target.files);
                  event.target.value = '';
                }}
              />
            </label>
          }
        >
          {data.evidence.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No evidence attached.</p>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {data.evidence.map((file) => (
                <a
                  key={file.id}
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-xl border border-border hover:border-primary"
                >
                  {file.file_type.startsWith('image/') && file.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.url} alt={file.file_name} className="h-32 w-full object-cover" />
                  ) : (
                    <div className="flex h-32 items-center justify-center text-muted-foreground">
                      <FileText size={24} />
                    </div>
                  )}
                  <div className="px-3 py-2 text-xs">
                    <p className="truncate font-medium">{file.file_name}</p>
                    <p className="text-muted-foreground">
                      {file.uploaded_by_name} · {shortDate(file.created_at)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </SectionPanel>

        <SectionPanel title="Investigation notes">
          {row.notes.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No investigation notes yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {[...row.notes].reverse().map((note, index) => (
                <li key={`${note.at}-${index}`} className="px-4 py-3 text-sm">
                  <p>{note.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {note.by} · {timestamp(note.at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionPanel>
      </div>

      <SectionPanel title="Activity timeline">
        <ol className="divide-y divide-border">
          {data.activity.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{entry.action}</p>
                <p className="text-xs text-muted-foreground">{entry.detail}</p>
              </div>
              <div className="text-end text-xs text-muted-foreground">
                <div>{entry.actor_name}</div>
                <div>{timestamp(entry.created_at)}</div>
              </div>
            </li>
          ))}
        </ol>
      </SectionPanel>

      <FormDialog
        open={dialog !== null}
        title={dialog === 'assign' ? 'Assign reviewer' : dialog === 'note' ? 'Add investigation note' : 'Resolve discrepancy'}
        onClose={() => setDialog(null)}
        footer={
          <>
            <PortButton variant="ghost" type="button" onClick={() => setDialog(null)} disabled={busy !== null}>
              Cancel
            </PortButton>
            <PortButton
              variant="primary"
              type="button"
              disabled={busy !== null || (dialog !== 'assign' && !text.trim()) || (dialog === 'assign' && !reviewer)}
              onClick={() => {
                if (dialog === 'assign') {
                  const officer = options?.officers.find((entry) => entry.value === reviewer);
                  void act('assign', { reviewer_id: reviewer, reviewer_name: officer?.label ?? '' });
                } else if (dialog === 'note') {
                  void act('note', { note: text });
                } else {
                  void act('resolve', { resolution: text });
                }
              }}
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : null}
              {dialog === 'assign' ? 'Assign' : dialog === 'note' ? 'Add note' : 'Save resolution'}
            </PortButton>
          </>
        }
      >
        <div className="space-y-3">
          {dialog === 'assign' ? (
            <>
              <Dropdown
                label="Reviewer"
                value={reviewer}
                onChange={setReviewer}
                options={options?.officers ?? []}
                placeholder="Select head office reviewer"
              />
              <p className="text-xs text-muted-foreground">The reviewer investigates the discrepancy and proposes a resolution.</p>
            </>
          ) : dialog === 'note' ? (
            <TextAreaField
              label="Investigation note"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="What has been checked and what still needs to happen?"
            />
          ) : (
            <>
              <TextAreaField
                label="Resolution"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Describe the correction required in the official asset record."
              />
              <p className="text-xs text-muted-foreground">
                Saving moves the discrepancy to Awaiting approval. Head office approves before any official asset change is made.
              </p>
            </>
          )}
          {dialog === 'resolve' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <StatusChip label={labelFrom(CAMPAIGN_PRIORITIES, row.priority)} tone={statusToneFromValue(row.priority)} />
              Priority stays as recorded unless a head office reviewer updates it.
            </div>
          )}
        </div>
      </FormDialog>
    </div>
  );
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium">{value || '—'}</dd>
    </div>
  );
}
