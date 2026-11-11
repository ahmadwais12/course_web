'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dropdown,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  StatCard,
  StatusChip,
  TextAreaField,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';
import { dateLabel } from '@/lib/display';

type TransferRow = {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  direction: 'in' | 'out';
  from: string;
  to: string;
  reason: string;
  date: string | null;
  status: string;
  updatedAt: string | null;
};

type Option = { value: string; label: string };

type FormState = {
  studentId: string;
  direction: string;
  from: string;
  to: string;
  date: string;
  reason: string;
};

const DIRECTION_OPTIONS = [
  { value: 'out', label: 'Outgoing (leaving)' },
  { value: 'in', label: 'Incoming (joining)' },
];

const emptyForm = (): FormState => ({
  studentId: '',
  direction: 'out',
  from: '',
  to: '',
  date: new Date().toISOString().slice(0, 10),
  reason: '',
});

export default function TransfersPage() {
  const [rows, setRows] = useState<TransferRow[]>([]);
  const [students, setStudents] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState('');

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admissions/transfers');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load transfers');
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setStudents(Array.isArray(data.students) ? data.students : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load transfers';
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
    items: rows as (TransferRow & Record<string, unknown>)[],
    searchKeys: ['studentName', 'studentCode', 'from', 'to', 'reason'],
    filterKey: direction,
    filterFn: (row) => !direction || row.direction === direction,
  });

  const stats = useMemo(
    () => ({
      total: rows.length,
      outgoing: rows.filter((row) => row.direction === 'out').length,
      incoming: rows.filter((row) => row.direction === 'in').length,
      thisYear: rows.filter((row) => String(row.date ?? '').startsWith(String(new Date().getFullYear()))).length,
    }),
    [rows]
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.studentId) {
      setFormError('Choose a student');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admissions/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record transfer');
      toast.success('Transfer recorded');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to record transfer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ListPageShell
        title="Transfers"
        description="Students moving in or out of the institute, with destination and reason."
        primaryAction={{
          label: 'Record Transfer',
          onClick: () => {
            setForm(emptyForm());
            setFormError(null);
            setOpen(true);
          },
        }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search student, institute, or reason…"
        onResetFilters={() => {
          list.reset();
          setDirection('');
        }}
        filters={[
          { key: 'direction', label: 'Direction', value: direction, options: DIRECTION_OPTIONS, onChange: setDirection },
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
            key: 'direction',
            header: 'Direction',
            render: (row) => (
              <StatusChip label={row.direction === 'in' ? 'incoming' : 'outgoing'} tone={row.direction === 'in' ? 'green' : 'purple'} />
            ),
          },
          {
            key: 'route',
            header: 'From → To',
            render: (row) => (
              <span className="text-sm">{[row.from || '—', row.to || '—'].join(' → ')}</span>
            ),
          },
          { key: 'reason', header: 'Reason', render: (row) => row.reason || '—' },
          { key: 'date', header: 'Transfer date', render: (row) => dateLabel(row.date) },
          {
            key: 'status',
            header: 'Status',
            render: () => <StatusChip label="transferred" tone="purple" />,
          },
        ]}
        rows={list.rows as TransferRow[]}
        rowKey={(row) => row.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No transfers recorded yet."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Transfers" value={stats.total} accent="blue" />
          <StatCard label="Outgoing" value={stats.outgoing} accent="purple" />
          <StatCard label="Incoming" value={stats.incoming} accent="green" />
          <StatCard label="This year" value={stats.thisYear} accent="gold" />
        </div>
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={open}
        title="Record Transfer"
        onClose={() => setOpen(false)}
        maxWidth="lg"
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel="Record transfer"
            submitting={saving}
            formId="transfer-form"
          />
        }
      >
        <form id="transfer-form" onSubmit={submit} className="space-y-4">
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
              label="Direction"
              required
              value={form.direction}
              onChange={(value) => setForm((prev) => ({ ...prev, direction: value }))}
              options={DIRECTION_OPTIONS}
            />
            <InputField
              label="Transfer date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="From institute"
              value={form.from}
              onChange={(e) => setForm((prev) => ({ ...prev, from: e.target.value }))}
            />
            <InputField
              label="To institute"
              value={form.to}
              onChange={(e) => setForm((prev) => ({ ...prev, to: e.target.value }))}
            />
          </div>
          <TextAreaField
            label="Reason"
            value={form.reason}
            onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder="Why the student is transferring"
          />
          <p className="m-0 text-xs text-muted-foreground">
            Outgoing transfers also mark the student record as transferred.
          </p>
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>
    </>
  );
}
