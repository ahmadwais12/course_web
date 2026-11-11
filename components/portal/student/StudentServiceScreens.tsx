'use client';

import React, { useState } from 'react';
import { BookMarked, Download, Plus, Star, Target } from 'lucide-react';
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
import {
  PortalError,
  PortalLoading,
  formatDate,
  formatMoney,
} from '@/components/portal/PortalUi';
import { StudentGate } from '@/components/portal/student/StudentScreens';
import type {
  PortalDigitalResource,
  PortalExamHistoryRow,
  PortalFeedbackEntry,
  PortalLeave,
  PortalLibraryBook,
  PortalLibraryLoan,
  PortalPlacementAttempt,
  PortalPlacementTest,
  PortalProgressRow,
  PortalStudentExtras,
} from '@/lib/portal-types';

const CURRENCY = 'AFN';

function ExtrasLoading({ error, refresh }: { error: string | null; refresh: () => void }) {
  if (error) return <PortalError message={error} onRetry={refresh} />;
  return <PortalLoading />;
}

function leaveDays(start: string, end: string | null) {
  const from = Date.parse(start);
  const to = Date.parse(end || start);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(1, Math.floor((to - from) / 86_400_000) + 1);
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export function StudentLeavesScreen() {
  const { refresh } = usePortalData('student');
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(todayInput());
  const [endDate, setEndDate] = useState(todayInput());
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setOpen(false);
    setStartDate(todayInput());
    setEndDate(todayInput());
    setReason('');
  };

  const submit = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/portal/student/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, reason }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Leave request could not be submitted');
      toast.success('Leave request submitted', {
        description: 'The academic office will review your request.',
      });
      reset();
      refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Leave request could not be submitted');
    } finally {
      setSaving(false);
    }
  };

  return (
    <StudentGate>
      {(data) => {
        const leaves: PortalLeave[] = data.leaves;
        const pending = leaves.filter((row) => (row.status || 'pending') === 'pending').length;
        const approved = leaves.filter((row) => row.status === 'approved').length;
        const rejected = leaves.filter((row) => row.status === 'rejected').length;

        const columns: DataColumn<PortalLeave>[] = [
          {
            key: 'period',
            header: 'Leave period',
            render: (row) => {
              const days = leaveDays(row.startDate, row.endDate);
              return (
                <div className="min-w-[170px]">
                  <p className="font-semibold">
                    {formatDate(row.startDate)}
                    {row.endDate && row.endDate !== row.startDate
                      ? ` – ${formatDate(row.endDate)}`
                      : ''}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {days} day{days === 1 ? '' : 's'}
                  </p>
                </div>
              );
            },
          },
          { key: 'type', header: 'Type', render: (row) => row.leaveType || 'Student leave' },
          {
            key: 'reason',
            header: 'Reason',
            render: (row) => (
              <span className="block max-w-[260px] truncate" title={row.reason || ''}>
                {row.reason || '—'}
              </span>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusChip
                label={row.status || 'pending'}
                tone={statusToneFromValue(row.status || 'pending')}
              />
            ),
          },
          { key: 'approved', header: 'Approved', render: (row) => formatDate(row.approvedAt) },
          {
            key: 'note',
            header: 'Office note',
            render: (row) => (
              <span className="block max-w-[220px] truncate" title={row.rejectionReason || ''}>
                {row.rejectionReason || '—'}
              </span>
            ),
          },
        ];

        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Leave Requests"
              description="Request leave from class and track the academic office's decision."
              actions={
                <PortButton variant="primary" onClick={() => setOpen(true)}>
                  <Plus size={15} /> Request leave
                </PortButton>
              }
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Requests" value={leaves.length} accent="blue" />
              <StatCard label="Pending" value={pending} accent="gold" />
              <StatCard label="Approved" value={approved} accent="green" />
              <StatCard label="Rejected" value={rejected} accent="purple" />
            </div>
            <SectionPanel
              title="My leave history"
              description="Approved leave is shared with your class teacher and attendance records."
            >
              <DataTable
                columns={columns}
                rows={leaves}
                rowKey={(row) => row.id}
                emptyMessage="You have not requested any leave yet."
              />
            </SectionPanel>

            <FormDialog
              open={open}
              title="Request leave"
              onClose={reset}
              footer={
                <FormDialogFooter
                  onCancel={reset}
                  submitLabel="Submit request"
                  submitting={saving}
                  formId="student-leave-form"
                  disabled={!startDate || !endDate || !reason.trim()}
                />
              }
            >
              <form
                id="student-leave-form"
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <InputField
                    label="From"
                    type="date"
                    required
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                  <InputField
                    label="To"
                    type="date"
                    required
                    value={endDate}
                    min={startDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </div>
                <TextAreaField
                  label="Reason"
                  required
                  rows={4}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Explain why you need leave (medical, family, travel…)"
                />
                <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  Your request is sent to the academic office. Attendance for approved days is
                  updated automatically.
                </p>
              </form>
            </FormDialog>
          </div>
        );
      }}
    </StudentGate>
  );
}

export function StudentProgressScreen() {
  const { data, loading, error, refresh } = usePortalExtras<PortalStudentExtras>('student');

  const history = data?.examHistory ?? [];
  const tracker = data?.progress ?? [];

  const subjects = new Map<
    string,
    { subject: string; attempts: number; total: number; best: number; latest: PortalExamHistoryRow }
  >();
  for (const row of history) {
    const key = row.subject || row.examName || 'General';
    const entry = subjects.get(key) ?? {
      subject: key,
      attempts: 0,
      total: 0,
      best: 0,
      latest: row,
    };
    entry.attempts += 1;
    entry.total += row.percentage ?? 0;
    entry.best = Math.max(entry.best, row.percentage ?? 0);
    if (String(row.examDate ?? '') >= String(entry.latest.examDate ?? '')) entry.latest = row;
    subjects.set(key, entry);
  }
  const subjectRows = [...subjects.values()]
    .map((row) => ({ ...row, average: Math.round(row.total / Math.max(1, row.attempts)) }))
    .sort((a, b) => b.average - a.average);
  const overall = history.length
    ? Math.round(history.reduce((sum, row) => sum + (row.percentage ?? 0), 0) / history.length)
    : 0;

  const historyColumns: DataColumn<PortalExamHistoryRow>[] = [
    {
      key: 'exam',
      header: 'Examination',
      render: (row) => (
        <div className="min-w-[180px]">
          <p className="font-semibold">{row.examName}</p>
          <p className="text-[11px] text-muted-foreground">{row.subject || 'General'}</p>
        </div>
      ),
    },
    { key: 'date', header: 'Date', render: (row) => formatDate(row.examDate) },
    {
      key: 'score',
      header: 'Score',
      align: 'right',
      render: (row) => (row.score == null ? '—' : `${row.score}/${row.maxScore ?? '—'}`),
    },
    {
      key: 'percentage',
      header: '%',
      align: 'right',
      render: (row) => (row.percentage == null ? '—' : `${row.percentage}%`),
    },
    {
      key: 'grade',
      header: 'Grade',
      render: (row) => (
        <StatusChip label={row.grade || '—'} tone={statusToneFromValue(row.grade || '')} />
      ),
    },
    { key: 'comments', header: 'Comments', render: (row) => row.comments || '—' },
  ];

  const trackerColumns: DataColumn<PortalProgressRow>[] = [
    {
      key: 'subject',
      header: 'Subject',
      render: (row) => <span className="font-semibold">{row.subject || 'General'}</span>,
    },
    {
      key: 'attendance',
      header: 'Attendance',
      align: 'right',
      render: (row) => `${Math.round(row.attendancePercentage)}%`,
    },
    {
      key: 'average',
      header: 'Average score',
      align: 'right',
      render: (row) => row.averageScore.toFixed(1),
    },
    {
      key: 'assignments',
      header: 'Assignments',
      align: 'right',
      render: (row) => `${row.assignmentsCompleted}/${row.assignmentsTotal}`,
    },
    {
      key: 'trend',
      header: 'Trend',
      render: (row) => (
        <StatusChip
          label={row.performanceTrend || 'steady'}
          tone={statusToneFromValue(row.performanceTrend || '')}
        />
      ),
    },
    { key: 'updated', header: 'Updated', render: (row) => formatDate(row.updatedAt) },
  ];

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="Academic Progress"
        description="Your performance trend across examinations, subjects, and tracked progress."
      />
      {loading || error ? (
        <ExtrasLoading error={error} refresh={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Overall average" value={`${overall}%`} accent="blue" />
            <StatCard label="Exams recorded" value={history.length} accent="purple" />
            <StatCard label="Subjects" value={subjectRows.length} accent="green" />
            <StatCard label="Best subject" value={subjectRows[0]?.subject || '—'} accent="gold" />
          </div>

          <SectionPanel
            title="Subject performance"
            description="Averages calculated from your recorded examination results."
          >
            {subjectRows.length ? (
              <DataTable
                columns={[
                  {
                    key: 'subject',
                    header: 'Subject',
                    render: (row) => <span className="font-semibold">{row.subject}</span>,
                  },
                  { key: 'attempts', header: 'Exams', align: 'right', render: (row) => row.attempts },
                  {
                    key: 'average',
                    header: 'Average',
                    align: 'right',
                    render: (row) => `${row.average}%`,
                  },
                  { key: 'best', header: 'Best', align: 'right', render: (row) => `${row.best}%` },
                  {
                    key: 'grade',
                    header: 'Latest grade',
                    render: (row) => (
                      <StatusChip
                        label={row.latest.grade || '—'}
                        tone={statusToneFromValue(row.latest.grade || '')}
                      />
                    ),
                  },
                  { key: 'latest', header: 'Latest exam', render: (row) => row.latest.examName },
                ]}
                rows={subjectRows}
                rowKey={(row) => row.subject}
                emptyMessage="No results have been recorded yet."
              />
            ) : (
              <EmptyState message="Your subject performance will appear after results are published." />
            )}
          </SectionPanel>

          <SectionPanel title="Examination history">
            <DataTable
              columns={historyColumns}
              rows={history}
              rowKey={(row) => row.id}
              emptyMessage="No examination results have been recorded yet."
            />
          </SectionPanel>

          {tracker.length > 0 && (
            <SectionPanel
              title="Tracked progress"
              description="Progress indicators maintained by the academic office."
            >
              <DataTable
                columns={trackerColumns}
                rows={tracker}
                rowKey={(row) => row.id}
                emptyMessage="No progress indicators recorded."
              />
            </SectionPanel>
          )}
        </>
      )}
    </div>
  );
}

export function StudentPlacementTestsScreen() {
  const { data, loading, error, refresh } = usePortalExtras<PortalStudentExtras>('student');
  const tests: PortalPlacementTest[] = data?.placementTests ?? [];
  const attempts: PortalPlacementAttempt[] = data?.placementAttempts ?? [];
  const bestScore = attempts.reduce((best, row) => Math.max(best, row.percentage ?? 0), 0);

  const attemptColumns: DataColumn<PortalPlacementAttempt>[] = [
    {
      key: 'test',
      header: 'Test',
      render: (row) => <span className="font-semibold">{row.testName}</span>,
    },
    { key: 'completed', header: 'Completed', render: (row) => formatDate(row.completedAt) },
    {
      key: 'score',
      header: 'Score',
      align: 'right',
      render: (row) => (row.score == null ? '—' : `${row.score}/${row.maxScore ?? '—'}`),
    },
    {
      key: 'percentage',
      header: '%',
      align: 'right',
      render: (row) => (row.percentage == null ? '—' : `${row.percentage}%`),
    },
    {
      key: 'grade',
      header: 'Grade',
      render: (row) => (
        <StatusChip label={row.grade || '—'} tone={statusToneFromValue(row.grade || '')} />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <StatusChip
          label={row.status || 'completed'}
          tone={statusToneFromValue(row.status || 'completed')}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="Placement Tests"
        description="Tests used to measure your level and place you in the right class."
      />
      {loading || error ? (
        <ExtrasLoading error={error} refresh={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Available tests" value={tests.length} accent="blue" />
            <StatCard label="My attempts" value={attempts.length} accent="purple" />
            <StatCard
              label="Best score"
              value={attempts.length ? `${bestScore}%` : '—'}
              accent="green"
            />
            <StatCard label="Level" value={attempts[0]?.grade || '—'} accent="gold" />
          </div>

          <SectionPanel
            title="Available tests"
            description="Ask the academic office to schedule a test if you have not been assessed yet."
          >
            {tests.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {tests.map((test: PortalPlacementTest) => (
                  <article
                    key={test.id}
                    className="rounded-xl border border-border bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-200">
                        <Target size={18} />
                      </span>
                      <StatusChip
                        label={test.examType?.replaceAll('_', ' ') || 'test'}
                        tone="blue"
                      />
                    </div>
                    <p className="mt-2 text-sm font-semibold">{test.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {test.description || test.instructions || 'Placement assessment.'}
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                        <p className="text-[10px] uppercase text-muted-foreground">Duration</p>
                        <p className="text-xs font-semibold">{test.durationMinutes ?? '—'} min</p>
                      </div>
                      <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                        <p className="text-[10px] uppercase text-muted-foreground">Questions</p>
                        <p className="text-xs font-semibold">{test.totalQuestions ?? '—'}</p>
                      </div>
                      <div className="rounded-lg bg-muted/60 px-2 py-1.5">
                        <p className="text-[10px] uppercase text-muted-foreground">Pass</p>
                        <p className="text-xs font-semibold">{test.passingScore ?? '—'}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState message="No placement tests are available right now." />
            )}
          </SectionPanel>

          <SectionPanel title="My attempts">
            <DataTable
              columns={attemptColumns}
              rows={attempts}
              rowKey={(row) => row.id}
              emptyMessage="You have not taken a placement test yet."
            />
          </SectionPanel>
        </>
      )}
    </div>
  );
}

export function StudentLibraryScreen() {
  const { data, loading, error, refresh } = usePortalExtras<PortalStudentExtras>('student');
  const library = data?.library ?? { books: [], loans: [], digital: [] };
  const availableCopies = library.books.reduce((sum, row) => sum + row.availableQuantity, 0);

  const loanColumns: DataColumn<PortalLibraryLoan>[] = [
    {
      key: 'book',
      header: 'Book',
      render: (row) => <span className="font-semibold">{row.bookTitle}</span>,
    },
    { key: 'issued', header: 'Issued', render: (row) => formatDate(row.issueDate) },
    { key: 'due', header: 'Due', render: (row) => formatDate(row.dueDate) },
    { key: 'returned', header: 'Returned', render: (row) => formatDate(row.returnDate) },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <StatusChip
          label={row.status || 'issued'}
          tone={statusToneFromValue(row.status || 'issued')}
        />
      ),
    },
    {
      key: 'fine',
      header: 'Fine',
      align: 'right',
      render: (row) => (row.fineAmount ? formatMoney(row.fineAmount, CURRENCY) : '—'),
    },
  ];

  const bookColumns: DataColumn<PortalLibraryBook>[] = [
    {
      key: 'title',
      header: 'Book',
      render: (row) => (
        <div className="min-w-[200px]">
          <p className="font-semibold">{row.title}</p>
          <p className="text-[11px] text-muted-foreground">{row.author || 'Unknown author'}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (row) => row.category || '—' },
    { key: 'year', header: 'Year', render: (row) => row.publishYear ?? '—' },
    {
      key: 'availability',
      header: 'Available',
      align: 'right',
      render: (row) => (
        <span
          className={
            row.availableQuantity > 0
              ? 'font-semibold text-emerald-600 dark:text-emerald-300'
              : 'text-muted-foreground'
          }
        >
          {row.availableQuantity}/{row.quantity}
        </span>
      ),
    },
    { key: 'shelf', header: 'Shelf', render: (row) => row.location || '—' },
  ];

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="Library"
        description="Books you have borrowed, the library catalogue, and digital resources."
      />
      {loading || error ? (
        <ExtrasLoading error={error} refresh={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Catalogue" value={library.books.length} accent="blue" />
            <StatCard label="Available copies" value={availableCopies} accent="green" />
            <StatCard label="My loans" value={library.loans.length} accent="gold" />
            <StatCard label="Digital resources" value={library.digital.length} accent="purple" />
          </div>

          <SectionPanel title="My borrowed books">
            <DataTable
              columns={loanColumns}
              rows={library.loans}
              rowKey={(row) => row.id}
              emptyMessage="You have no borrowed books. Visit the library desk to borrow one."
            />
          </SectionPanel>

          <SectionPanel title="Catalogue" description="Titles available at the library.">
            <DataTable
              columns={bookColumns}
              rows={library.books}
              rowKey={(row) => row.id}
              emptyMessage="The library catalogue is empty."
            />
          </SectionPanel>

          {library.digital.length > 0 && (
            <SectionPanel title="Digital library">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {library.digital.map((row: PortalDigitalResource) => (
                  <article
                    key={row.id}
                    className="rounded-xl border border-border bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-200">
                        <BookMarked size={18} />
                      </span>
                      <StatusChip label={row.type || 'resource'} tone="blue" />
                    </div>
                    <p className="mt-2 text-sm font-semibold">{row.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {row.subject || 'General'} · {row.author || 'Library'}
                    </p>
                    {row.fileUrl && row.downloadEnabled && (
                      <a
                        href={row.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline dark:text-sky-300"
                      >
                        <Download size={12} /> Open resource
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </SectionPanel>
          )}
        </>
      )}
    </div>
  );
}

const FEEDBACK_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'course', label: 'Course' },
  { value: 'teacher', label: 'Teaching' },
  { value: 'facility', label: 'Facilities' },
  { value: 'service', label: 'Services' },
];

const FEEDBACK_RATINGS = [
  { value: '0', label: 'No rating' },
  { value: '5', label: '5 — Excellent' },
  { value: '4', label: '4 — Good' },
  { value: '3', label: '3 — Average' },
  { value: '2', label: '2 — Poor' },
  { value: '1', label: '1 — Very poor' },
];

export function StudentFeedbackScreen() {
  const { data, loading, error, refresh } = usePortalExtras<PortalStudentExtras>('student');
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('general');
  const [rating, setRating] = useState('0');
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [anonymous, setAnonymous] = useState('no');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setOpen(false);
    setFeedbackType('general');
    setRating('0');
    setTitle('');
    setComment('');
    setAnonymous('no');
  };

  const submit = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/portal/student/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackType,
          rating: Number(rating) || null,
          title,
          comment,
          anonymous: anonymous === 'yes',
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Feedback could not be submitted');
      toast.success('Feedback submitted', { description: 'Thank you for helping us improve.' });
      reset();
      refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Feedback could not be submitted');
    } finally {
      setSaving(false);
    }
  };

  const entries = data?.feedback ?? [];
  const rated = entries.filter((row) => row.rating != null);
  const averageRating = rated.length
    ? (rated.reduce((sum, row) => sum + (row.rating ?? 0), 0) / rated.length).toFixed(1)
    : '—';

  const columns: DataColumn<PortalFeedbackEntry>[] = [
    {
      key: 'title',
      header: 'Feedback',
      render: (row) => (
        <div className="min-w-[200px]">
          <p className="font-semibold">{row.title || 'Feedback'}</p>
          <p className="line-clamp-2 text-[11px] text-muted-foreground">{row.comment || '—'}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => row.feedbackType?.replaceAll('_', ' ') || 'general',
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (row) =>
        row.rating == null ? (
          '—'
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold">
            <Star size={12} className="text-amber-500" /> {row.rating}/5
          </span>
        ),
    },
    { key: 'created', header: 'Submitted', render: (row) => formatDate(row.createdAt) },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <StatusChip
          label={row.status || 'submitted'}
          tone={statusToneFromValue(row.status || '')}
        />
      ),
    },
    {
      key: 'response',
      header: 'Response',
      render: (row) => (
        <span className="block max-w-[220px] truncate" title={row.response || ''}>
          {row.response || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="Feedback"
        description="Share suggestions about your courses, teachers, facilities, and services."
        actions={
          <PortButton variant="primary" onClick={() => setOpen(true)}>
            <Plus size={15} /> Give feedback
          </PortButton>
        }
      />
      {loading || error ? (
        <ExtrasLoading error={error} refresh={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Submitted" value={entries.length} accent="blue" />
            <StatCard label="Average rating" value={averageRating} accent="gold" />
            <StatCard
              label="Responded"
              value={entries.filter((row) => row.response).length}
              accent="green"
            />
            <StatCard
              label="Anonymous"
              value={entries.filter((row) => row.isAnonymous).length}
              accent="purple"
            />
          </div>
          <SectionPanel
            title="My feedback"
            description="Responses from the academic office appear here."
          >
            <DataTable
              columns={columns}
              rows={entries}
              rowKey={(row) => row.id}
              emptyMessage="You have not submitted any feedback yet."
            />
          </SectionPanel>
        </>
      )}

      <FormDialog
        open={open}
        title="Give feedback"
        onClose={reset}
        footer={
          <FormDialogFooter
            onCancel={reset}
            submitLabel="Submit feedback"
            submitting={saving}
            formId="student-feedback-form"
            disabled={!title.trim() || !comment.trim()}
          />
        }
      >
        <form
          id="student-feedback-form"
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Dropdown
              label="About"
              value={feedbackType}
              onChange={setFeedbackType}
              options={FEEDBACK_TYPES}
            />
            <Dropdown label="Rating" value={rating} onChange={setRating} options={FEEDBACK_RATINGS} />
          </div>
          <InputField
            label="Subject"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Short summary"
          />
          <TextAreaField
            label="Comments"
            required
            rows={4}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Tell us what is working and what could be better…"
          />
          <Dropdown
            label="Submit anonymously"
            value={anonymous}
            onChange={setAnonymous}
            options={[
              { value: 'no', label: 'No — show my name' },
              { value: 'yes', label: 'Yes — hide my name' },
            ]}
          />
        </form>
      </FormDialog>
    </div>
  );
}
