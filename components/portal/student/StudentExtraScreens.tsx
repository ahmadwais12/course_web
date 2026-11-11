'use client';

import React, { useState } from 'react';
import { BookOpen, Download, LifeBuoy, Plus, Printer } from 'lucide-react';
import {
  DataTable,
  Dropdown,
  EmptyState,
  FormDialog,
  FormDialogFooter,
  InputField,
  PageHeader,
  PortButton,
  SectionPanel,
  StatCard,
  StatusChip,
  TextAreaField,
  statusToneFromValue,
  type DataColumn,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { usePortalData } from '@/components/portal/PortalDataContext';
import { usePortalExtras } from '@/components/portal/usePortalExtras';
import { PortalError, PortalLoading, formatDate, formatMoney, formatMonth, formatShortDate } from '@/components/portal/PortalUi';
import { StudentGate } from '@/components/portal/student/StudentScreens';
import type {
  PortalAssignment,
  PortalCalendarEntry,
  PortalExam,
  PortalFeeStructureRow,
  PortalGrade,
  PortalInvoice,
  PortalMaterial,
  PortalPayment,
  PortalStudentExtras,
  PortalSupportTicket,
} from '@/lib/portal-types';

const CURRENCY = 'AFN';

function ExtrasLoading({ error, refresh }: { error: string | null; refresh: () => void }) {
  if (error) return <PortalError message={error} onRetry={refresh} />;
  return <PortalLoading />;
}

export function StudentSubmissionsScreen() {
  return (
    <StudentGate>
      {(data) => {
        const submitted = data.assignments.filter((item) => item.submittedAt);
        const graded = submitted.filter((item) => item.marksObtained != null);
        const columns: DataColumn<PortalAssignment>[] = [
          {
            key: 'title',
            header: 'Assignment',
            render: (row) => (
              <div className="min-w-[200px]">
                <p className="font-semibold">{row.title}</p>
                <p className="text-[11px] text-muted-foreground">{row.subjectName || 'Subject'}</p>
              </div>
            ),
          },
          { key: 'submitted', header: 'Submitted', render: (row) => formatDate(row.submittedAt) },
          { key: 'due', header: 'Due', render: (row) => formatDate(row.dueDate) },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusChip
                label={row.submissionStatus || 'submitted'}
                tone={statusToneFromValue(row.submissionStatus || 'submitted')}
              />
            ),
          },
          {
            key: 'marks',
            header: 'Marks',
            render: (row) => (row.marksObtained == null ? '—' : `${row.marksObtained}/${row.maxMarks ?? '—'}`),
          },
          {
            key: 'feedback',
            header: 'Teacher feedback',
            render: (row) => (
              <span className="block max-w-[240px] truncate" title={row.feedback || ''}>
                {row.feedback || '—'}
              </span>
            ),
          },
        ];

        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="My Submissions"
              description="Everything you have submitted, with marks and teacher feedback."
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Submitted" value={submitted.length} accent="blue" />
              <StatCard label="Graded" value={graded.length} accent="green" />
              <StatCard label="Awaiting review" value={submitted.length - graded.length} accent="gold" />
              <StatCard label="Assignments" value={data.assignments.length} accent="purple" />
            </div>
            <SectionPanel title="Submission history">
              <DataTable
                columns={columns}
                rows={submitted}
                rowKey={(row) => row.id}
                emptyMessage="You have not submitted any assignments yet."
              />
            </SectionPanel>
          </div>
        );
      }}
    </StudentGate>
  );
}

export function StudentResultsScreen() {
  return (
    <StudentGate>
      {(data) => {
        const graded = data.results.filter((row) => row.score != null);
        const average = graded.length
          ? Math.round(
              graded.reduce((sum, row) => sum + (row.percentage ?? 0), 0) / graded.length
            )
          : 0;
        const passed = graded.filter((row) => (row.percentage ?? 0) >= 50).length;

        const resultColumns: DataColumn<PortalGrade>[] = [
          { key: 'exam', header: 'Examination', render: (row) => row.examName || '—' },
          { key: 'subject', header: 'Subject', render: (row) => row.subject || '—' },
          {
            key: 'score',
            header: 'Score',
            align: 'right',
            render: (row) => (row.score == null ? '—' : `${row.score}/${row.maxScore ?? '—'}`),
          },
          { key: 'percentage', header: 'Percentage', align: 'right', render: (row) => (row.percentage == null ? '—' : `${row.percentage}%`) },
          {
            key: 'grade',
            header: 'Grade',
            render: (row) => <StatusChip label={row.grade || '—'} tone={statusToneFromValue(row.grade || '')} />,
          },
          { key: 'graded', header: 'Graded', render: (row) => formatDate(row.gradedAt) },
        ];

        const examColumns: DataColumn<PortalExam>[] = [
          { key: 'name', header: 'Examination', render: (row) => row.name },
          { key: 'subject', header: 'Subject', render: (row) => row.subject || '—' },
          { key: 'date', header: 'Date', render: (row) => formatDate(row.examDate) },
          { key: 'time', header: 'Start', render: (row) => row.startTime || '—' },
          { key: 'marks', header: 'Total marks', align: 'right', render: (row) => row.totalMarks ?? '—' },
          {
            key: 'result',
            header: 'Result',
            render: (row) =>
              row.result ? (
                <StatusChip label={row.result.grade || `${row.result.percentage ?? 0}%`} tone={statusToneFromValue(row.result.grade || '')} />
              ) : (
                <span className="text-[11px] text-muted-foreground">Pending</span>
              ),
          },
        ];

        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Grades & Marks"
              description="Results recorded against your examinations, plus the upcoming exam schedule."
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Average" value={`${average}%`} accent="blue" />
              <StatCard label="Results" value={graded.length} accent="purple" />
              <StatCard label="Passed" value={passed} accent="green" />
              <StatCard label="Exams" value={data.exams.length} accent="gold" />
            </div>
            <SectionPanel title="Results">
              <DataTable
                columns={resultColumns}
                rows={data.results}
                rowKey={(row) => row.id}
                emptyMessage="No results have been published yet."
              />
            </SectionPanel>
            <SectionPanel title="Examination schedule">
              <DataTable
                columns={examColumns}
                rows={data.exams}
                rowKey={(row) => row.id}
                emptyMessage="No examinations are scheduled."
              />
            </SectionPanel>
          </div>
        );
      }}
    </StudentGate>
  );
}

export function StudentTranscriptScreen() {
  return (
    <StudentGate>
      {(data) => {
        const bySubject = new Map<
          string,
          { subject: string; attempts: number; total: number; best: number; grade: string | null }
        >();
        for (const row of data.results) {
          const key = row.subject || row.examName || 'General';
          const entry = bySubject.get(key) ?? {
            subject: key,
            attempts: 0,
            total: 0,
            best: 0,
            grade: row.grade,
          };
          entry.attempts += 1;
          entry.total += row.percentage ?? 0;
          entry.best = Math.max(entry.best, row.percentage ?? 0);
          entry.grade = row.grade || entry.grade;
          bySubject.set(key, entry);
        }
        const rows = [...bySubject.values()].map((row) => ({
          ...row,
          average: Math.round(row.total / Math.max(1, row.attempts)),
        }));
        const overall = rows.length
          ? Math.round(rows.reduce((sum, row) => sum + row.average, 0) / rows.length)
          : 0;

        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Academic Transcript"
              description="A subject-by-subject summary of recorded results across the academic year."
              actions={
                <PortButton variant="ghost" onClick={() => window.print()}>
                  <Printer size={15} /> Print
                </PortButton>
              }
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Overall average" value={`${overall}%`} accent="blue" />
              <StatCard label="Subjects" value={rows.length} accent="purple" />
              <StatCard label="Results" value={data.results.length} accent="green" />
              <StatCard
                label="Best subject"
                value={rows.length ? [...rows].sort((a, b) => b.average - a.average)[0].subject : '—'}
                accent="gold"
              />
            </div>
            <SectionPanel title="Transcript" description="Calculated from published examination results.">
              {rows.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-3">Subject</th>
                        <th className="py-2 pr-3 text-right">Attempts</th>
                        <th className="py-2 pr-3 text-right">Average</th>
                        <th className="py-2 pr-3 text-right">Best</th>
                        <th className="py-2 text-right">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...rows].sort((a, b) => b.average - a.average).map((row) => (
                        <tr key={row.subject} className="border-b border-border/60 last:border-0">
                          <td className="py-2.5 pr-3 font-semibold">{row.subject}</td>
                          <td className="py-2.5 pr-3 text-right">{row.attempts}</td>
                          <td className="py-2.5 pr-3 text-right">{row.average}%</td>
                          <td className="py-2.5 pr-3 text-right">{row.best}%</td>
                          <td className="py-2.5 text-right">
                            <StatusChip label={row.grade || '—'} tone={statusToneFromValue(row.grade || '')} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState message="No results have been published, so a transcript cannot be generated yet." />
              )}
            </SectionPanel>
          </div>
        );
      }}
    </StudentGate>
  );
}

export function StudentCalendarScreen() {
  const { data, loading, error, refresh } = usePortalExtras<PortalStudentExtras>('student');
  const today = new Date().toISOString().slice(0, 10);
  const entries = data?.calendar.filter((row) => row.startDate.slice(0, 10) >= today) ?? [];
  const grouped = entries.reduce<Record<string, PortalCalendarEntry[]>>((acc, row) => {
    const key = row.startDate.slice(0, 7);
    acc[key] = acc[key] ?? [];
    acc[key].push(row);
    return acc;
  }, {});

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="Academic Calendar"
        description="Upcoming academic events, examinations, and holidays."
      />
      {loading || error ? (
        <ExtrasLoading error={error} refresh={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Upcoming" value={entries.length} accent="blue" />
            <StatCard label="Events" value={entries.filter((row) => row.source === 'event').length} accent="purple" />
            <StatCard label="Exams" value={entries.filter((row) => row.source === 'exam').length} accent="gold" />
            <StatCard label="Holidays" value={entries.filter((row) => row.source === 'holiday').length} accent="green" />
          </div>
          {entries.length ? (
            <div className="space-y-4">
              {Object.entries(grouped).map(([month, rows]) => (
                <SectionPanel key={month} title={formatMonth(month)}>
                  <ul className="divide-y divide-border">
                    {rows.map((row) => (
                      <li key={row.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                        <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-200">
                          <span className="text-[10px] font-semibold uppercase">
                            {formatShortDate(row.startDate).split(' ')[0].slice(0, 3)}
                          </span>
                          <span className="text-sm font-bold leading-none">
                            {row.startDate.slice(8, 10)}
                          </span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{row.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {row.description || row.location || '—'} · {row.type}
                          </p>
                        </div>
                        <StatusChip
                          label={row.source}
                          tone={row.source === 'exam' ? 'gold' : row.source === 'holiday' ? 'green' : 'blue'}
                        />
                      </li>
                    ))}
                  </ul>
                </SectionPanel>
              ))}
            </div>
          ) : (
            <SectionPanel title="Calendar">
              <EmptyState message="No upcoming events, exams, or holidays have been published." />
            </SectionPanel>
          )}
        </>
      )}
    </div>
  );
}

export function StudentMaterialsScreen() {
  const { data, loading, error, refresh } = usePortalExtras<PortalStudentExtras>('student');

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="Learning Materials"
        description="Lesson notes and resources shared by your teachers."
      />
      {loading || error ? (
        <ExtrasLoading error={error} refresh={refresh} />
      ) : data?.materials.length ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Materials" value={data.materials.length} accent="blue" />
            <StatCard label="Subjects" value={new Set(data.materials.map((row) => row.subjectName).filter(Boolean)).size} accent="purple" />
            <StatCard label="Created" value={data.materials.length} accent="green" />
            <StatCard label="This month" value={data.materials.filter((row) => (row.lessonDate || '').slice(0, 7) === new Date().toISOString().slice(0, 7)).length} accent="gold" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.materials.map((row: PortalMaterial) => (
              <article key={row.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-200">
                    <BookOpen size={18} />
                  </span>
                  <StatusChip label={row.status || 'material'} tone={statusToneFromValue(row.status || '')} />
                </div>
                <p className="mt-2 text-sm font-semibold">{row.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {row.subjectName || 'Subject'} · {formatDate(row.lessonDate)}
                  {row.durationMinutes ? ` · ${row.durationMinutes} min` : ''}
                </p>
                {row.objectives && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground"><span className="font-semibold">Objectives:</span> {row.objectives}</p>}
                {row.materials && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground"><span className="font-semibold">Materials:</span> {row.materials}</p>}
                {row.assessment && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground"><span className="font-semibold">Assessment:</span> {row.assessment}</p>}
              </article>
            ))}
          </div>
        </>
      ) : (
        <SectionPanel title="Materials">
          <EmptyState message="No learning materials have been shared for your class yet." />
        </SectionPanel>
      )}
    </div>
  );
}

export function StudentInvoicesScreen() {
  return (
    <StudentGate>
      {(data) => {
        const { invoices, payments, totals } = data.finance;
        const invoiceColumns: DataColumn<PortalInvoice>[] = [
          { key: 'number', header: 'Invoice', render: (row) => <span className="font-semibold">{row.invoiceNumber}</span> },
          { key: 'issue', header: 'Issued', render: (row) => formatDate(row.issueDate) },
          { key: 'due', header: 'Due', render: (row) => formatDate(row.dueDate) },
          { key: 'total', header: 'Total', align: 'right', render: (row) => formatMoney(row.totalAmount, CURRENCY) },
          { key: 'paid', header: 'Paid', align: 'right', render: (row) => formatMoney(row.paidAmount, CURRENCY) },
          { key: 'outstanding', header: 'Balance', align: 'right', render: (row) => formatMoney(row.outstandingAmount, CURRENCY) },
          { key: 'status', header: 'Status', render: (row) => <StatusChip label={row.status || 'pending'} tone={statusToneFromValue(row.status || 'pending')} /> },
        ];
        const paymentColumns: DataColumn<PortalPayment>[] = [
          { key: 'number', header: 'Payment', render: (row) => <span className="font-semibold">{row.paymentNumber}</span> },
          { key: 'date', header: 'Date', render: (row) => formatDate(row.paymentDate) },
          { key: 'method', header: 'Method', render: (row) => row.paymentMethod?.replaceAll('_', ' ') || '—' },
          { key: 'type', header: 'Type', render: (row) => row.paymentType?.replaceAll('_', ' ') || '—' },
          { key: 'amount', header: 'Amount', align: 'right', render: (row) => formatMoney(row.amount, CURRENCY) },
          { key: 'status', header: 'Status', render: (row) => <StatusChip label={row.status || 'completed'} tone={statusToneFromValue(row.status || 'completed')} /> },
          {
            key: 'receipt',
            header: 'Receipt',
            render: (row) =>
              row.receiptUrl ? (
                <a href={row.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline dark:text-sky-300">
                  <Download size={12} /> Receipt
                </a>
              ) : (
                <span className="text-[11px] text-muted-foreground">—</span>
              ),
          },
        ];

        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Invoices & Payments"
              description="Your invoices, payment history, outstanding balance, and receipts."
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Billed" value={formatMoney(totals.billed, CURRENCY)} accent="blue" />
              <StatCard label="Paid" value={formatMoney(totals.paid, CURRENCY)} accent="green" />
              <StatCard label="Outstanding" value={formatMoney(totals.outstanding, CURRENCY)} accent="gold" />
              <StatCard label="Overdue" value={formatMoney(totals.overdue, CURRENCY)} accent="purple" />
            </div>
            <SectionPanel title="Invoices">
              <DataTable columns={invoiceColumns} rows={invoices} rowKey={(row) => row.id} emptyMessage="No invoices have been issued." />
            </SectionPanel>
            <SectionPanel title="Payment history">
              <DataTable columns={paymentColumns} rows={payments} rowKey={(row) => row.id} emptyMessage="No payments recorded yet." />
            </SectionPanel>
          </div>
        );
      }}
    </StudentGate>
  );
}

export function StudentFeeStructureScreen() {
  const { data, loading, error, refresh } = usePortalExtras<PortalStudentExtras>('student');
  const columns: DataColumn<PortalFeeStructureRow>[] = [
    {
      key: 'name',
      header: 'Fee',
      render: (row) => (
        <div>
          <p className="font-semibold">{row.name}</p>
          <p className="text-[11px] text-muted-foreground">{row.feeType || 'Fee'}</p>
        </div>
      ),
    },
    { key: 'class', header: 'Class', render: (row) => row.className || '—' },
    { key: 'amount', header: 'Amount', align: 'right', render: (row) => formatMoney(row.amount, row.currency) },
    { key: 'frequency', header: 'Frequency', render: (row) => row.frequency?.replaceAll('_', ' ') || '—' },
    { key: 'due', header: 'Due day', render: (row) => (row.dueDay ? `Day ${row.dueDay}` : '—') },
    { key: 'period', header: 'Applies', render: (row) => `${formatDate(row.effectiveFrom)} – ${formatDate(row.effectiveUntil)}` },
    { key: 'status', header: 'Status', render: (row) => <StatusChip label={row.isActive ? 'active' : 'inactive'} tone={row.isActive ? 'green' : 'gray'} /> },
  ];

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="Fee Structure"
        description="The fees configured for your class and program."
      />
      {loading || error ? (
        <ExtrasLoading error={error} refresh={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Fees" value={data?.feeStructure.length ?? 0} accent="blue" />
            <StatCard label="Active" value={data?.feeStructure.filter((row) => row.isActive).length ?? 0} accent="green" />
            <StatCard
              label="Monthly total"
              value={formatMoney(
                (data?.feeStructure ?? []).filter((row) => row.frequency === 'monthly').reduce((sum, row) => sum + row.amount, 0),
                CURRENCY
              )}
              accent="gold"
            />
            <StatCard
              label="One-time total"
              value={formatMoney(
                (data?.feeStructure ?? []).filter((row) => row.frequency === 'one_time').reduce((sum, row) => sum + row.amount, 0),
                CURRENCY
              )}
              accent="purple"
            />
          </div>
          <SectionPanel title="Configured fees">
            <DataTable columns={columns} rows={data?.feeStructure ?? []} rowKey={(row) => row.id} emptyMessage="No fee structure has been configured for your class." />
          </SectionPanel>
        </>
      )}
    </div>
  );
}

export function StudentSupportScreen() {
  const { data, loading, error, refresh } = usePortalExtras<PortalStudentExtras>('student');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [priority, setPriority] = useState('medium');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setOpen(false);
    setTitle('');
    setDescription('');
    setCategory('other');
    setPriority('medium');
  };

  const submit = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/portal/student/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, category, priority }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Request could not be submitted');
      toast.success('Request submitted', { description: 'The academic office will review it.' });
      reset();
      refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Request could not be submitted');
    } finally {
      setSaving(false);
    }
  };

  const columns: DataColumn<PortalSupportTicket>[] = [
    {
      key: 'subject',
      header: 'Request',
      render: (row) => (
        <div className="min-w-[220px]">
          <p className="font-semibold">{row.title}</p>
          <p className="line-clamp-2 text-[11px] text-muted-foreground">{row.description || '—'}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (row) => row.category?.replaceAll('_', ' ') || '—' },
    { key: 'created', header: 'Submitted', render: (row) => formatDate(row.createdAt) },
    { key: 'priority', header: 'Priority', render: (row) => <StatusChip label={row.priority || 'medium'} tone={statusToneFromValue(row.priority || 'medium')} /> },
    { key: 'status', header: 'Status', render: (row) => <StatusChip label={row.status || 'open'} tone={statusToneFromValue(row.status || 'open')} /> },
    { key: 'resolution', header: 'Resolution', render: (row) => <span className="block max-w-[220px] truncate" title={row.resolutionNotes || ''}>{row.resolutionNotes || '—'}</span> },
  ];

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="Support & Complaints"
        description="Raise an academic or account issue and follow its resolution."
        actions={
          <PortButton variant="primary" onClick={() => setOpen(true)}>
            <Plus size={15} /> New request
          </PortButton>
        }
      />
      {loading || error ? (
        <ExtrasLoading error={error} refresh={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Requests" value={data?.support.length ?? 0} accent="blue" />
            <StatCard label="Open" value={data?.support.filter((row) => (row.status || 'open') === 'open').length ?? 0} accent="gold" />
            <StatCard label="In progress" value={data?.support.filter((row) => row.status === 'in_progress').length ?? 0} accent="purple" />
            <StatCard label="Resolved" value={data?.support.filter((row) => row.status === 'resolved' || row.status === 'closed').length ?? 0} accent="green" />
          </div>
          <SectionPanel title="My requests">
            <DataTable columns={columns} rows={data?.support ?? []} rowKey={(row) => row.id} emptyMessage="You have not raised any support requests." />
          </SectionPanel>
          <SectionPanel title="Need help?" description="Academic records are handled by the academic office.">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LifeBuoy size={16} className="text-sky-600 dark:text-sky-300" />
              Raise a request above or send a message to the administration through the shared messaging centre.
            </div>
          </SectionPanel>
        </>
      )}

      <FormDialog
        open={open}
        title="New support request"
        onClose={reset}
        footer={
          <FormDialogFooter
            onCancel={reset}
            submitLabel="Submit request"
            submitting={saving}
            formId="student-support-form"
            disabled={!title.trim() || !description.trim()}
          />
        }
      >
        <form
          id="student-support-form"
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <InputField label="Subject" required value={title} onChange={(event) => setTitle(event.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Dropdown
              label="Category"
              value={category}
              onChange={setCategory}
              options={[
                { value: 'other', label: 'Other' },
                { value: 'account', label: 'Account' },
                { value: 'access', label: 'Access' },
                { value: 'software', label: 'Software' },
                { value: 'hardware', label: 'Hardware' },
                { value: 'bug', label: 'Report a bug' },
              ]}
            />
            <Dropdown
              label="Priority"
              value={priority}
              onChange={setPriority}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
            />
          </div>
          <TextAreaField
            label="Details"
            required
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the issue…"
          />
        </form>
      </FormDialog>
    </div>
  );
}
