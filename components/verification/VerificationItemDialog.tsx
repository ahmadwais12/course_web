'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Loader2, MapPin, Save, SkipForward, XCircle } from 'lucide-react';
import {
  Dropdown,
  ErrorBanner,
  FormDialog,
  InputField,
  PortButton,
  TextAreaField,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import {
  PHYSICAL_CONDITIONS,
  VERIFY_RESULTS,
  VERIFY_METHODS,
} from '@/lib/verification';

export type VerificationItemRow = {
  id: string;
  asset_code: string;
  asset_name: string;
  category: string;
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
  serial_confirmed: boolean;
  label_present: boolean;
  in_use: boolean;
  employee_confirmed: boolean;
  method: string;
  verified_by_name: string;
  verified_at: string | null;
  notes: string;
};

type FormState = {
  result: string;
  actual_branch: string;
  actual_department: string;
  actual_location: string;
  actual_condition: string;
  serial_confirmed: boolean;
  label_present: boolean;
  in_use: boolean;
  employee_confirmed: boolean;
  notes: string;
};

function formFrom(item: VerificationItemRow): FormState {
  return {
    result: item.result === 'pending' ? 'found' : item.result,
    actual_branch: item.actual_branch || item.expected_branch,
    actual_department: item.actual_department || item.expected_department,
    actual_location: item.actual_location || item.expected_location,
    actual_condition: item.actual_condition || '',
    serial_confirmed: item.serial_confirmed,
    label_present: item.label_present,
    in_use: item.in_use,
    employee_confirmed: item.employee_confirmed,
    notes: item.notes || '',
  };
}

type Props = {
  open: boolean;
  sessionId: string;
  item: VerificationItemRow | null;
  initialMethod?: string;
  allowNext?: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onNext?: () => void;
};

export default function VerificationItemDialog({
  open,
  sessionId,
  item,
  initialMethod = 'manual',
  allowNext = false,
  onClose,
  onSaved,
  onNext,
}: Props) {
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<{ name: string; url: string }[]>([]);

  useEffect(() => {
    if (open && item) {
      setForm(formFrom(item));
      setError(null);
      setUploads([]);
    }
  }, [open, item]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  const conditionOptions = useMemo(
    () => PHYSICAL_CONDITIONS.map((row) => ({ value: row.value, label: row.label })),
    []
  );

  const upload = async (files: FileList | null) => {
    if (!files?.length || !item) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.set('file', file);
        body.set('session_id', sessionId);
        body.set('verification_item_id', item.id);
        const res = await fetch('/api/inventory/verification/uploads', { method: 'POST', body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Could not upload ${file.name}`);
        setUploads((current) => [...current, { name: file.name, url: data.url }]);
      }
      toast.success('Evidence uploaded');
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload evidence');
    } finally {
      setUploading(false);
    }
  };

  const save = async (override?: Partial<FormState>, next = false) => {
    if (!item || !form) return;
    const payload = { ...form, ...override };
    if (payload.result === 'pending') {
      setError('Choose a verification result.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/inventory/verification/sessions/${sessionId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.id,
          result: payload.result,
          actual_branch: payload.actual_branch,
          actual_department: payload.actual_department,
          actual_location: payload.actual_location,
          actual_condition: payload.actual_condition,
          serial_confirmed: payload.serial_confirmed,
          label_present: payload.label_present,
          in_use: payload.in_use,
          employee_confirmed: payload.employee_confirmed,
          method: initialMethod,
          notes: payload.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save the verification');
      toast.success(`${item.asset_code} — ${VERIFY_RESULTS.find((row) => row.value === payload.result)?.label ?? 'saved'}`);
      await onSaved();
      if (next && onNext) onNext();
      else onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the verification');
    } finally {
      setSaving(false);
    }
  };

  const mustEscalate = form && !['found', 'not_found', 'wrong_location', 'damaged', 'inactive', 'unable'].includes(form.result);

  return (
    <FormDialog
      open={open}
      title={item ? `Verify ${item.asset_code}` : 'Verify asset'}
      onClose={onClose}
      maxWidth="2xl"
      footer={
        <>
          <PortButton variant="ghost" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </PortButton>
          {allowNext && (
            <PortButton
              variant="secondary"
              type="button"
              disabled={saving || uploading}
              onClick={() => void save(undefined, true)}
            >
              <SkipForward size={15} /> Save &amp; verify next
            </PortButton>
          )}
          <PortButton
            variant="secondary"
            type="button"
            disabled={saving}
            onClick={() => void save({ result: 'not_found' })}
          >
            <XCircle size={15} /> Mark as not found
          </PortButton>
          <PortButton variant="primary" type="button" disabled={saving || uploading} onClick={() => void save()}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save verification
          </PortButton>
        </>
      }
    >
      {!item || !form ? (
        <p className="text-sm text-muted-foreground">Asset not loaded.</p>
      ) : (
        <div className="space-y-4">
          {error && <ErrorBanner message={error} />}

          <div className="grid gap-2 rounded-xl border border-border bg-muted/30 p-3 text-sm sm:grid-cols-2">
            <Info label="Asset" value={`${item.asset_name} (${item.asset_code})`} />
            <Info label="Category" value={item.category || '—'} />
            <Info label="Serial number" value={item.serial_number || '—'} />
            <Info label="Assigned employee" value={item.holder_name || '—'} />
            <Info label="Official status" value={item.expected_status || '—'} />
            <Info label="Official condition" value={item.expected_condition || '—'} />
            <Info
              label="Expected location"
              value={[item.expected_branch, item.expected_department, item.expected_location].filter(Boolean).join(' · ') || '—'}
            />
            <Info label="Expected branch" value={item.expected_branch || '—'} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Dropdown
              label="Verification result"
              required
              value={form.result}
              onChange={(value) => set('result', value)}
              options={VERIFY_RESULTS.filter((row) => row.value !== 'pending').map((row) => ({
                value: row.value,
                label: row.label,
              }))}
            />
            <Dropdown
              label="Physical condition"
              value={form.actual_condition}
              onChange={(value) => set('actual_condition', value)}
              options={conditionOptions}
              placeholder="Select condition"
              clearable
            />
            <InputField
              label="Actual branch"
              value={form.actual_branch}
              onChange={(event) => set('actual_branch', event.target.value)}
            />
            <InputField
              label="Actual department"
              value={form.actual_department}
              onChange={(event) => set('actual_department', event.target.value)}
            />
            <InputField
              label="Actual location"
              value={form.actual_location}
              onChange={(event) => set('actual_location', event.target.value)}
              placeholder="Room, floor, store, shelf…"
              containerClassName="sm:col-span-2"
            />
          </div>

          <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
            {(
              [
                ['serial_confirmed', 'Serial number confirmed'],
                ['label_present', 'Asset label / QR present'],
                ['in_use', 'Asset is in use'],
                ['employee_confirmed', 'Custody confirmed by employee'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border accent-[#88b6ff]"
                  checked={form[key]}
                  onChange={(event) => set(key, event.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>

          <TextAreaField
            label="Officer notes"
            value={form.notes}
            onChange={(event) => set('notes', event.target.value)}
            placeholder="Anything the reviewer should know about this asset."
          />

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">Evidence</p>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-[7px] border border-border bg-card px-3 py-2 text-xs font-semibold shadow-sm hover:bg-muted">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                {uploading ? 'Uploading…' : 'Add photo or PDF'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                  multiple
                  disabled={uploading}
                  onChange={(event) => {
                    void upload(event.target.files);
                    event.target.value = '';
                  }}
                />
              </label>
            </div>
            {uploads.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Photos, signed sheets, or PDFs (max 8MB each). Evidence is required for discrepancy results when enabled in settings.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {uploads.map((file) => (
                  <li key={file.url || file.name} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs">
                    {file.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin size={12} /> Method: {VERIFY_METHODS.find((row) => row.value === initialMethod)?.label ?? 'Manual'} · recorded against
            your user with the current timestamp.
          </p>
          {mustEscalate && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Choose a discrepancy result (not found, wrong location, damaged, inactive, unable) to raise an issue for head office.
            </p>
          )}
        </div>
      )}
    </FormDialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate font-medium">{value || '—'}</p>
    </div>
  );
}
