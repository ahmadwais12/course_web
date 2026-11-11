'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CheckCircle, CircleSlash, PhoneCall, UserCheck } from 'lucide-react';
import {
  Dropdown,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  RowActions,
  StatCard,
  StatusChip,
  TextAreaField,
  statusToneFromValue,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { dateLabel } from '@/lib/display';

type LeadRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  program: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  followUpDate: string | null;
  assignedTo: string | null;
  assignedName: string | null;
  createdAt: string | null;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  program: string;
  source: string;
  followUpDate: string;
  notes: string;
};

const STATUS_OPTIONS = [
  { value: 'New', label: 'New' },
  { value: 'Contacted', label: 'Contacted' },
  { value: 'Visited', label: 'Visited' },
  { value: 'Admitted', label: 'Admitted' },
  { value: 'Lost', label: 'Lost' },
];

const SOURCE_OPTIONS = [
  { value: 'Walk-in', label: 'Walk-in' },
  { value: 'Phone', label: 'Phone' },
  { value: 'Website', label: 'Website' },
  { value: 'Social media', label: 'Social media' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Other', label: 'Other' },
];

const emptyForm = (): FormState => ({
  name: '',
  email: '',
  phone: '',
  program: '',
  source: 'Walk-in',
  followUpDate: '',
  notes: '',
});

export default function AdmissionApplicationsPage() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admissions/leads');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load applications');
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load applications';
      setRows([]);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const list = useListQuery({
    items: rows as (LeadRow & Record<string, unknown>)[],
    searchKeys: ['name', 'email', 'phone', 'program', 'notes'],
    filterKey: `${status}|${source}`,
    filterFn: (row) =>
      (!status || row.status === status) && (!source || row.source === source),
  });

  const stats = useMemo(
    () => ({
      total: rows.length,
      new: rows.filter((row) => row.status === 'New').length,
      inProgress: rows.filter((row) => row.status === 'Contacted' || row.status === 'Visited').length,
      admitted: rows.filter((row) => row.status === 'Admitted').length,
    }),
    [rows]
  );

  const updateStatus = async (id: string, next: string) => {
    try {
      const res = await fetch('/api/admissions/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update application');
      toast.success(`Application marked ${next.toLowerCase()}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update application');
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Applicant name is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admissions/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save application');
      toast.success('Application recorded');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save application');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ListPageShell
        title="Applications"
        description="Admission enquiries and applications from first contact to admission."
        primaryAction={{
          label: 'New Application',
          onClick: () => {
            setForm(emptyForm());
            setFormError(null);
            setOpen(true);
          },
        }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search applicant, phone, or program…"
        onResetFilters={() => {
          list.reset();
          setStatus('');
          setSource('');
        }}
        filters={[
          { key: 'status', label: 'Status', value: status, options: STATUS_OPTIONS, onChange: setStatus },
          { key: 'source', label: 'Source', value: source, options: SOURCE_OPTIONS, onChange: setSource },
        ]}
        loading={loading}
        columns={[
          {
            key: 'name',
            header: 'Applicant',
            render: (row) => (
              <div>
                <div className="font-semibold">{row.name}</div>
                <div className="text-xs text-muted-foreground">
                  {[row.phone, row.email].filter(Boolean).join(' · ') || 'No contact details'}
                </div>
              </div>
            ),
          },
          { key: 'program', header: 'Interested program', render: (row) => row.program || '—' },
          { key: 'source', header: 'Source', render: (row) => row.source || '—' },
          { key: 'followUp', header: 'Follow-up', render: (row) => dateLabel(row.followUpDate) },
          { key: 'assignee', header: 'Assigned to', render: (row) => row.assignedName || '—' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusChip label={row.status} tone={statusToneFromValue(row.status)} />,
          },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (row) => (
              <RowActions
                overflow={[
                  {
                    key: 'contacted',
                    label: 'Mark contacted',
                    icon: <PhoneCall size={16} />,
                    onClick: () => void updateStatus(row.id, 'Contacted'),
                    disabled: row.status === 'Contacted',
                  },
                  {
                    key: 'visited',
                    label: 'Mark visited',
                    icon: <UserCheck size={16} />,
                    onClick: () => void updateStatus(row.id, 'Visited'),
                    disabled: row.status === 'Visited',
                  },
                  {
                    key: 'admitted',
                    label: 'Mark admitted',
                    icon: <CheckCircle2 size={16} />,
                    onClick: () => void updateStatus(row.id, 'Admitted'),
                    disabled: row.status === 'Admitted',
                  },
                  {
                    key: 'lost',
                    label: 'Mark lost',
                    icon: <CircleSlash size={16} />,
                    onClick: () => void updateStatus(row.id, 'Lost'),
                    disabled: row.status === 'Lost',
                    danger: true,
                  },
                ]}
              />
            ),
          },
        ]}
        rows={list.rows as LeadRow[]}
        rowKey={(row) => row.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No applications yet. Record the first enquiry to start the pipeline."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Applications" value={stats.total} accent="blue" />
          <StatCard label="New" value={stats.new} accent="gold" />
          <StatCard label="In progress" value={stats.inProgress} accent="purple" />
          <StatCard label="Admitted" value={stats.admitted} accent="green" />
        </div>
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={open}
        title="New Application"
        onClose={() => setOpen(false)}
        maxWidth="xl"
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel="Record application"
            submitting={saving}
            formId="application-form"
          />
        }
      >
        <form id="application-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Applicant name"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <InputField
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <InputField
              label="Interested program"
              value={form.program}
              onChange={(e) => setForm((prev) => ({ ...prev, program: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Dropdown
              label="Source"
              value={form.source}
              onChange={(value) => setForm((prev) => ({ ...prev, source: value }))}
              options={SOURCE_OPTIONS}
            />
            <InputField
              label="Follow-up date"
              type="date"
              value={form.followUpDate}
              onChange={(e) => setForm((prev) => ({ ...prev, followUpDate: e.target.value }))}
            />
          </div>
          <TextAreaField
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="What the applicant asked about"
          />
          <p className="m-0 flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle size={14} /> New applications start with the New status.
          </p>
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>
    </>
  );
}
