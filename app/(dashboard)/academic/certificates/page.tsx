'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Ban, FileText } from 'lucide-react';
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

type CertificateRow = {
  id: string;
  studentId: string | null;
  studentName: string;
  studentCode: string;
  certificateType: string;
  courseName: string | null;
  levelAchieved: string | null;
  issueDate: string | null;
  number: string | null;
  url: string | null;
  status: string;
  notes: string | null;
};

type Option = { value: string; label: string };

type FormState = {
  studentId: string;
  certificateType: string;
  courseName: string;
  levelAchieved: string;
  issueDate: string;
  number: string;
  url: string;
  notes: string;
};

const CERT_TYPES = [
  { value: 'completion', label: 'Completion' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'participation', label: 'Participation' },
  { value: 'merit', label: 'Merit' },
  { value: 'level', label: 'Level' },
];

const emptyForm = (): FormState => ({
  studentId: '',
  certificateType: 'completion',
  courseName: '',
  levelAchieved: '',
  issueDate: new Date().toISOString().slice(0, 10),
  number: '',
  url: '',
  notes: '',
});

export default function CertificatesPage() {
  const [rows, setRows] = useState<CertificateRow[]>([]);
  const [students, setStudents] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [status, setStatus] = useState('');

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/academic/certificates');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load certificates');
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setStudents(Array.isArray(data.students) ? data.students : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load certificates';
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
    items: rows as (CertificateRow & Record<string, unknown>)[],
    searchKeys: ['studentName', 'studentCode', 'courseName', 'number'],
    filterKey: `${typeFilter}|${status}`,
    filterFn: (row) =>
      (!typeFilter || row.certificateType === typeFilter) && (!status || row.status === status),
  });

  const stats = useMemo(
    () => ({
      total: rows.length,
      issued: rows.filter((row) => row.status === 'issued').length,
      draft: rows.filter((row) => row.status === 'draft').length,
      revoked: rows.filter((row) => row.status === 'revoked').length,
    }),
    [rows]
  );

  const updateStatus = async (id: string, next: string) => {
    try {
      const res = await fetch('/api/academic/certificates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update certificate');
      toast.success(`Certificate marked ${next}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update certificate');
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.studentId) {
      setFormError('Choose the student receiving this certificate');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/academic/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to issue certificate');
      toast.success(data.number ? `Certificate ${data.number} issued` : 'Certificate issued');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to issue certificate');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ListPageShell
        title="Certificates"
        description="Completion, achievement, and merit certificates issued to students."
        primaryAction={{
          label: 'Issue Certificate',
          onClick: () => {
            setForm(emptyForm());
            setFormError(null);
            setOpen(true);
          },
        }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search student, course, or certificate number…"
        onResetFilters={() => {
          list.reset();
          setTypeFilter('');
          setStatus('');
        }}
        filters={[
          { key: 'type', label: 'Type', value: typeFilter, options: CERT_TYPES, onChange: setTypeFilter },
          {
            key: 'status',
            label: 'Status',
            value: status,
            options: [
              { value: 'issued', label: 'Issued' },
              { value: 'draft', label: 'Draft' },
              { value: 'revoked', label: 'Revoked' },
            ],
            onChange: setStatus,
          },
        ]}
        loading={loading}
        columns={[
          {
            key: 'student',
            header: 'Student',
            render: (row) => (
              <div>
                <div className="font-semibold">{row.studentName}</div>
                <div className="text-xs text-muted-foreground">{row.studentCode}</div>
              </div>
            ),
          },
          {
            key: 'course',
            header: 'Course / level',
            render: (row) => (
              <div>
                <div>{row.courseName || '—'}</div>
                <div className="text-xs text-muted-foreground">{row.levelAchieved || ''}</div>
              </div>
            ),
          },
          {
            key: 'type',
            header: 'Type',
            render: (row) => CERT_TYPES.find((t) => t.value === row.certificateType)?.label ?? row.certificateType,
          },
          { key: 'number', header: 'Number', render: (row) => row.number || '—' },
          { key: 'date', header: 'Issued', render: (row) => dateLabel(row.issueDate) },
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
                    key: 'issue',
                    label: 'Mark issued',
                    icon: <BadgeCheck size={16} />,
                    onClick: () => void updateStatus(row.id, 'issued'),
                    disabled: row.status === 'issued',
                  },
                  {
                    key: 'draft',
                    label: 'Move to draft',
                    icon: <FileText size={16} />,
                    onClick: () => void updateStatus(row.id, 'draft'),
                    disabled: row.status === 'draft',
                  },
                  {
                    key: 'revoke',
                    label: 'Revoke certificate',
                    icon: <Ban size={16} />,
                    onClick: () => void updateStatus(row.id, 'revoked'),
                    disabled: row.status === 'revoked',
                    danger: true,
                  },
                ]}
              />
            ),
          },
        ]}
        rows={list.rows as CertificateRow[]}
        rowKey={(row) => row.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No certificates issued yet."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Certificates" value={stats.total} accent="blue" />
          <StatCard label="Issued" value={stats.issued} accent="green" />
          <StatCard label="Drafts" value={stats.draft} accent="gold" />
          <StatCard label="Revoked" value={stats.revoked} accent="purple" />
        </div>
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={open}
        title="Issue Certificate"
        onClose={() => setOpen(false)}
        maxWidth="xl"
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel="Issue certificate"
            submitting={saving}
            formId="certificate-form"
          />
        }
      >
        <form id="certificate-form" onSubmit={submit} className="space-y-4">
          <Dropdown
            label="Student"
            required
            value={form.studentId}
            onChange={(value) => setForm((prev) => ({ ...prev, studentId: value }))}
            options={students}
            placeholder="Choose a student"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Dropdown
              label="Certificate type"
              required
              value={form.certificateType}
              onChange={(value) => setForm((prev) => ({ ...prev, certificateType: value }))}
              options={CERT_TYPES}
            />
            <InputField
              label="Issue date"
              required
              type="date"
              value={form.issueDate}
              onChange={(e) => setForm((prev) => ({ ...prev, issueDate: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Course name"
              value={form.courseName}
              onChange={(e) => setForm((prev) => ({ ...prev, courseName: e.target.value }))}
              placeholder="Advanced English"
            />
            <InputField
              label="Level achieved"
              value={form.levelAchieved}
              onChange={(e) => setForm((prev) => ({ ...prev, levelAchieved: e.target.value }))}
              placeholder="B2"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Certificate number"
              value={form.number}
              onChange={(e) => setForm((prev) => ({ ...prev, number: e.target.value }))}
              hint="Leave blank to generate automatically"
            />
            <InputField
              label="Certificate URL"
              value={form.url}
              onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
              placeholder="https://…"
            />
          </div>
          <TextAreaField
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>
    </>
  );
}
