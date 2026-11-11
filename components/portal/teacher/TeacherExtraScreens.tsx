'use client';

import React, { useMemo, useState } from 'react';
import { FileCheck, Plus } from 'lucide-react';
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
import { PortalError, PortalLoading, ProgressBar, formatDate } from '@/components/portal/PortalUi';
import { TeacherGate } from '@/components/portal/teacher/TeacherScreens';
import type {
  PortalTeacherAttendanceRow,
  PortalTeacherExtras,
  PortalTeacherGradeRow,
  PortalTeacherSubmission,
} from '@/lib/portal-types';

function ExtrasLoading({ error, refresh }: { error: string | null; refresh: () => void }) {
  if (error) return <PortalError message={error} onRetry={refresh} />;
  return <PortalLoading />;
}

export function TeacherSubjectsScreen() {
  return (
    <TeacherGate>
      {(data) => {
        const subjects = data.subjects;
        const byName = new Map<string, { name: string; code: string; classes: Set<string>; teachers: Set<string> }>();
        for (const row of subjects) {
          const entry = byName.get(row.name) ?? { name: row.name, code: row.code, classes: new Set<string>(), teachers: new Set<string>() };
          if (row.className) entry.classes.add(row.className);
          if (row.teacherName) entry.teachers.add(row.teacherName);
          byName.set(row.name, entry);
        }
        const rows = [...byName.values()];

        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="My Subjects"
              description="Subjects you teach and the classes where they are assigned."
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Subjects" value={rows.length} accent="green" />
              <StatCard label="Assignments" value={subjects.length} accent="blue" />
              <StatCard label="Classes" value={data.classes.length} accent="purple" />
              <StatCard label="Students" value={data.students.length} accent="gold" />
            </div>
            <SectionPanel title="Subject assignments">
              {rows.length ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {subjects.map((row) => (
                    <article key={`${row.id}-${row.classId}`} className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">
                          <FileCheck size={18} />
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {row.code || 'Subject'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold">{row.name}</p>
                      <p className="text-[11px] text-muted-foreground">{row.className || 'Class'}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState message="No subjects are assigned to you yet." />
              )}
            </SectionPanel>
          </div>
        );
      }}
    </TeacherGate>
  );
}

export function TeacherAttendanceHistoryScreen() {
  const { data, loading, error, refresh } = usePortalExtras<PortalTeacherExtras>('teacher');
  const [classFilter, setClassFilter] = useState('');

  const rows = useMemo(
    () => (data?.attendance ?? []).filter((row) => !classFilter || row.classId === classFilter),
    [data, classFilter]
  );

  const columns: DataColumn<PortalTeacherAttendanceRow>[] = [
    { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
    { key: 'student', header: 'Student', render: (row) => <span className="font-semibold">{row.studentName}</span> },
    { key: 'class', header: 'Class', render: (row) => row.className || '—' },
    { key: 'status', header: 'Status', render: (row) => <StatusChip label={row.status || '—'} tone={statusToneFromValue(row.status || '')} /> },
    { key: 'late', header: 'Late minutes', align: 'right', render: (row) => (row.lateMinutes ? row.lateMinutes : '—') },
    { key: 'remarks', header: 'Remarks', render: (row) => row.remarks || '—' },
  ];

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="Attendance History"
        description="Recorded attendance for students in your assigned classes."
      />
      {loading || error ? (
        <ExtrasLoading error={error} refresh={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Records" value={rows.length} accent="green" />
            <StatCard label="Present" value={rows.filter((row) => row.status === 'present').length} accent="blue" />
            <StatCard label="Late" value={rows.filter((row) => row.status === 'late').length} accent="gold" />
            <StatCard label="Absent" value={rows.filter((row) => row.status === 'absent').length} accent="purple" />
          </div>
          <SectionPanel
            title="Attendance records"
            headerRight={
              <div className="w-44">
                <Dropdown
                  value={classFilter}
                  onChange={setClassFilter}
                  options={[
                    { value: '', label: 'All classes' },
                    ...(data?.attendance ?? [])
                      .map((row) => ({ value: row.classId || '', label: row.className || 'Class' }))
                      .filter((option, index, all) => option.value && all.findIndex((item) => item.value === option.value) === index),
                  ]}
                />
              </div>
            }
          >
            <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} emptyMessage="No attendance has been recorded yet." />
          </SectionPanel>
        </>
      )}
    </div>
  );
}

export function TeacherAttendanceReportsScreen() {
  const { data, loading, error, refresh } = usePortalExtras<PortalTeacherExtras>('teacher');

  const perClass = useMemo(() => {
    const map = new Map<string, { name: string; total: number; present: number; late: number; absent: number; excused: number }>();
    for (const row of data?.attendance ?? []) {
      const key = row.classId || 'unassigned';
      const entry = map.get(key) ?? { name: row.className || 'Unassigned', total: 0, present: 0, late: 0, absent: 0, excused: 0 };
      entry.total += 1;
      if (row.status === 'present') entry.present += 1;
      else if (row.status === 'late') entry.late += 1;
      else if (row.status === 'absent') entry.absent += 1;
      else if (row.status === 'excused') entry.excused += 1;
      map.set(key, entry);
    }
    return [...map.values()].map((row) => ({
      ...row,
      percentage: row.total ? Math.round(((row.present + row.late) / row.total) * 100) : 0,
    }));
  }, [data]);

  const overall = data?.attendance.length
    ? Math.round(
        ((data.attendance.filter((row) => row.status === 'present').length +
          data.attendance.filter((row) => row.status === 'late').length) /
          data.attendance.length) *
          100
      )
    : 0;

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="Attendance Reports"
        description="Attendance analysis by class, calculated from recorded student attendance."
      />
      {loading || error ? (
        <ExtrasLoading error={error} refresh={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Overall attendance" value={`${overall}%`} accent="green" />
            <StatCard label="Records" value={data?.attendance.length ?? 0} accent="blue" />
            <StatCard label="Classes" value={perClass.length} accent="purple" />
            <StatCard label="Late records" value={data?.attendance.filter((row) => row.status === 'late').length ?? 0} accent="gold" />
          </div>
          <SectionPanel title="Class breakdown">
            {perClass.length ? (
              <div className="space-y-3">
                {perClass.map((row) => (
                  <div key={row.name} className="rounded-xl border border-border p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{row.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {row.present} present · {row.late} late · {row.absent} absent · {row.excused} excused
                        </p>
                      </div>
                      <span className="text-sm font-bold">{row.percentage}%</span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={row.percentage} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No attendance records exist for your classes yet." />
            )}
          </SectionPanel>
        </>
      )}
    </div>
  );
}

export function TeacherSubmissionsScreen() {
  const { data, refresh } = usePortalData('teacher');
  const [target, setTarget] = useState<PortalTeacherSubmission | null>(null);
  const [marks, setMarks] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <TeacherGate>
      {(portalData) => {
        const submissions = portalData.submissions;
        const pending = submissions.filter((row) => row.status !== 'graded');
        const graded = submissions.filter((row) => row.status === 'graded');

        const openGrade = (row: PortalTeacherSubmission) => {
          setTarget(row);
          setMarks(row.marksObtained == null ? '' : String(row.marksObtained));
          setFeedback(row.feedback || '');
        };

        const close = () => {
          setTarget(null);
          setMarks('');
          setFeedback('');
        };

        const save = async () => {
          if (!target) return;
          setSaving(true);
          try {
            const response = await fetch('/api/portal/teacher/submissions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                submissionId: target.id,
                marksObtained: marks === '' ? null : Number(marks),
                feedback,
              }),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body?.error || 'Submission could not be graded');
            toast.success('Submission graded');
            close();
            refresh();
          } catch (cause) {
            toast.error(cause instanceof Error ? cause.message : 'Submission could not be graded');
          } finally {
            setSaving(false);
          }
        };

        const columns: DataColumn<PortalTeacherSubmission>[] = [
          {
            key: 'student',
            header: 'Student',
            render: (row) => (
              <div className="min-w-[180px]">
                <p className="font-semibold">{row.studentName}</p>
                <p className="text-[11px] text-muted-foreground">{row.homeworkTitle}</p>
              </div>
            ),
          },
          { key: 'class', header: 'Class', render: (row) => row.className || '—' },
          { key: 'submitted', header: 'Submitted', render: (row) => formatDate(row.submittedAt) },
          { key: 'status', header: 'Status', render: (row) => <StatusChip label={row.status || 'submitted'} tone={statusToneFromValue(row.status || 'submitted')} /> },
          { key: 'marks', header: 'Marks', align: 'right', render: (row) => (row.marksObtained == null ? '—' : row.marksObtained) },
          {
            key: 'file',
            header: 'File',
            render: (row) =>
              row.submissionUrl ? (
                <a href={row.submissionUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-300">
                  Open
                </a>
              ) : (
                '—'
              ),
          },
          {
            key: 'actions',
            header: '',
            render: (row) => (
              <PortButton className="h-8 px-3 text-xs" onClick={() => openGrade(row)}>
                {row.status === 'graded' ? 'Update' : 'Grade'}
              </PortButton>
            ),
          },
        ];

        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Student Submissions"
              description="Review submitted work, add feedback, and assign marks."
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Submissions" value={submissions.length} accent="green" />
              <StatCard label="Pending review" value={pending.length} accent="gold" />
              <StatCard label="Graded" value={graded.length} accent="blue" />
              <StatCard label="Assignments" value={portalData.assignments.length} accent="purple" />
            </div>
            <SectionPanel title="All submissions">
              <DataTable columns={columns} rows={submissions} rowKey={(row) => row.id} emptyMessage="No submissions have been received yet." />
            </SectionPanel>

            <FormDialog
              open={Boolean(target)}
              title={target ? `Grade: ${target.studentName}` : 'Grade submission'}
              onClose={close}
              footer={
                <FormDialogFooter
                  onCancel={close}
                  submitLabel="Save grade"
                  submitting={saving}
                  formId="teacher-grade-submission-form"
                />
              }
            >
              <form
                id="teacher-grade-submission-form"
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void save();
                }}
              >
                <div className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  {target?.homeworkTitle} · {target?.className || 'Class'} · submitted {formatDate(target?.submittedAt)}
                </div>
                <InputField
                  label="Marks obtained"
                  type="number"
                  min="0"
                  value={marks}
                  onChange={(event) => setMarks(event.target.value)}
                />
                <TextAreaField
                  label="Feedback"
                  rows={4}
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder="Comment on the student's work…"
                />
              </form>
            </FormDialog>
          </div>
        );
      }}
    </TeacherGate>
  );
}

export function TeacherGradesScreen() {
  const { refresh } = usePortalData('teacher');
  const { data, loading, error, refresh: refreshExtras } = usePortalExtras<PortalTeacherExtras>('teacher');
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [examName, setExamName] = useState('');
  const [subject, setSubject] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10));
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);

  const refreshAll = () => {
    refresh();
    refreshExtras();
  };

  return (
    <TeacherGate>
      {(portalData) => {
        const selectedStudent = portalData.students.find((row) => row.id === studentId) ?? null;
        const subjectOptions = [...new Set(portalData.subjects.map((row) => row.name))]
          .filter(Boolean)
          .map((name) => ({ value: name, label: name }));

        const reset = () => {
          setOpen(false);
          setStudentId('');
          setExamName('');
          setSubject('');
          setScore('');
          setMaxScore('100');
          setComments('');
        };

        const submit = async () => {
          if (!selectedStudent?.classId) {
            toast.error('Select a student with an assigned class');
            return;
          }
          setSaving(true);
          try {
            const response = await fetch('/api/portal/teacher/grades', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                studentId: selectedStudent.id,
                classId: selectedStudent.classId,
                examName,
                subject,
                score: Number(score),
                maxScore: Number(maxScore),
                examDate,
                comments,
              }),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body?.error || 'Marks could not be saved');
            toast.success('Marks saved', { description: `${examName} · ${body.percentage ?? ''}%` });
            reset();
            refreshAll();
          } catch (cause) {
            toast.error(cause instanceof Error ? cause.message : 'Marks could not be saved');
          } finally {
            setSaving(false);
          }
        };

        const columns: DataColumn<PortalTeacherGradeRow>[] = [
          {
            key: 'student',
            header: 'Student',
            render: (row) => (
              <div>
                <p className="font-semibold">{row.studentName}</p>
                <p className="text-[11px] text-muted-foreground">{row.className || '—'}</p>
              </div>
            ),
          },
          { key: 'exam', header: 'Examination', render: (row) => row.examName },
          { key: 'subject', header: 'Subject', render: (row) => row.subject || '—' },
          { key: 'score', header: 'Score', align: 'right', render: (row) => `${row.score}/${row.maxScore}` },
          { key: 'percentage', header: '%', align: 'right', render: (row) => (row.percentage == null ? '—' : `${row.percentage}%`) },
          { key: 'grade', header: 'Grade', render: (row) => <StatusChip label={row.grade || '—'} tone={statusToneFromValue(row.grade || '')} /> },
          { key: 'date', header: 'Exam date', render: (row) => formatDate(row.examDate) },
        ];

        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Enter Marks"
              description="Record examination marks for students in your assigned classes."
              actions={
                <PortButton variant="primary" onClick={() => setOpen(true)}>
                  <Plus size={15} /> Enter marks
                </PortButton>
              }
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Results entered" value={data?.grades.length ?? 0} accent="green" />
              <StatCard label="Students" value={portalData.students.length} accent="blue" />
              <StatCard label="Classes" value={portalData.classes.length} accent="purple" />
              <StatCard label="Examinations" value={portalData.exams.length} accent="gold" />
            </div>
            <SectionPanel title="Marks recorded">
              {loading || error ? (
                <ExtrasLoading error={error} refresh={refreshExtras} />
              ) : (
                <DataTable columns={columns} rows={data?.grades ?? []} rowKey={(row) => row.id} emptyMessage="No marks have been entered yet." />
              )}
            </SectionPanel>

            <FormDialog
              open={open}
              title="Enter examination marks"
              onClose={reset}
              footer={
                <FormDialogFooter
                  onCancel={reset}
                  submitLabel="Save marks"
                  submitting={saving}
                  formId="teacher-marks-form"
                  disabled={!studentId || !examName.trim() || !score}
                />
              }
            >
              <form
                id="teacher-marks-form"
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
                <Dropdown
                  label="Student"
                  required
                  value={studentId}
                  onChange={setStudentId}
                  options={portalData.students.map((row) => ({
                    value: row.id,
                    label: `${row.fullName} · ${row.className || 'No class'}`,
                  }))}
                  placeholder="Select a student"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <InputField
                    label="Examination name"
                    required
                    value={examName}
                    onChange={(event) => setExamName(event.target.value)}
                    placeholder="Midterm examination"
                  />
                  <Dropdown
                    label="Subject"
                    value={subject}
                    onChange={setSubject}
                    options={subjectOptions}
                    placeholder="Select a subject"
                  />
                  <InputField
                    label="Score"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={score}
                    onChange={(event) => setScore(event.target.value)}
                  />
                  <InputField
                    label="Maximum marks"
                    type="number"
                    min="1"
                    required
                    value={maxScore}
                    onChange={(event) => setMaxScore(event.target.value)}
                  />
                  <InputField
                    label="Exam date"
                    type="date"
                    value={examDate}
                    onChange={(event) => setExamDate(event.target.value)}
                  />
                </div>
                <TextAreaField
                  label="Comments"
                  rows={3}
                  value={comments}
                  onChange={(event) => setComments(event.target.value)}
                  placeholder="Optional remarks for the student record…"
                />
              </form>
            </FormDialog>
          </div>
        );
      }}
    </TeacherGate>
  );
}

export function TeacherResultsScreen() {
  const { data, loading, error, refresh } = usePortalExtras<PortalTeacherExtras>('teacher');
  const byExam = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number; best: number; classNames: Set<string> }>();
    for (const row of data?.grades ?? []) {
      const entry = map.get(row.examName) ?? { name: row.examName, count: 0, total: 0, best: 0, classNames: new Set<string>() };
      entry.count += 1;
      entry.total += row.percentage ?? 0;
      entry.best = Math.max(entry.best, row.percentage ?? 0);
      if (row.className) entry.classNames.add(row.className);
      map.set(row.examName, entry);
    }
    return [...map.values()]
      .map((row) => ({ ...row, average: Math.round(row.total / Math.max(1, row.count)) }))
      .sort((a, b) => b.average - a.average);
  }, [data]);

  const columns: DataColumn<PortalTeacherGradeRow>[] = [
    { key: 'exam', header: 'Examination', render: (row) => <span className="font-semibold">{row.examName}</span> },
    { key: 'student', header: 'Student', render: (row) => row.studentName },
    { key: 'class', header: 'Class', render: (row) => row.className || '—' },
    { key: 'score', header: 'Score', align: 'right', render: (row) => `${row.score}/${row.maxScore}` },
    { key: 'percentage', header: '%', align: 'right', render: (row) => (row.percentage == null ? '—' : `${row.percentage}%`) },
    { key: 'grade', header: 'Grade', render: (row) => <StatusChip label={row.grade || '—'} tone={statusToneFromValue(row.grade || '')} /> },
    { key: 'date', header: 'Date', render: (row) => formatDate(row.examDate) },
  ];

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="Result History"
        description="Recorded examination results across your classes."
      />
      {loading || error ? (
        <ExtrasLoading error={error} refresh={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Results" value={data?.grades.length ?? 0} accent="green" />
            <StatCard label="Examinations" value={byExam.length} accent="blue" />
            <StatCard label="Best average" value={byExam.length ? `${byExam[0].average}%` : '—'} accent="gold" />
            <StatCard label="Students graded" value={new Set((data?.grades ?? []).map((row) => row.studentId)).size} accent="purple" />
          </div>
          <SectionPanel title="Examination averages">
            {byExam.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {byExam.map((row) => (
                  <div key={row.name} className="rounded-xl border border-border p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{row.name}</p>
                      <span className="text-sm font-bold">{row.average}%</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {row.count} results · best {row.best}% · {[...row.classNames].join(', ') || '—'}
                    </p>
                    <div className="mt-2">
                      <ProgressBar value={row.average} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No results have been recorded yet." />
            )}
          </SectionPanel>
          <SectionPanel title="All results">
            <DataTable columns={columns} rows={data?.grades ?? []} rowKey={(row) => row.id} emptyMessage="No results recorded." />
          </SectionPanel>
        </>
      )}
    </div>
  );
}