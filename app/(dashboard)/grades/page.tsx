'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ListPageShell,
  StatusChip,
  statusToneFromValue,
  StatCard,
  InputField,
  Dropdown,
  PortButton,
} from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';
import { toast } from '@/components/ui/Toast';
import { X } from 'lucide-react';

type GradeRow = {
  id: string;
  student_name: string;
  student_code?: string | null;
  subject: string;
  exam_name?: string | null;
  exam_type?: string | null;
  exam_date?: string | null;
  score?: number | null;
  max_score?: number | null;
  percentage?: number | null;
  letter?: string | null;
  status: string;
  remarks?: string | null;
  [key: string]: unknown;
};

type StudentOption = { id: string; full_name: string; student_code?: string };

function letterTone(letter?: string | null) {
  if (!letter) return 'gray' as const;
  const L = letter.toUpperCase();
  if (L.startsWith('A')) return 'green' as const;
  if (L.startsWith('B')) return 'blue' as const;
  if (L.startsWith('C')) return 'gold' as const;
  return 'purple' as const;
}

function letterFromPercent(pct: number): string {
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}

export default function GradesPage() {
  const [items, setItems] = useState<GradeRow[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [examType, setExamType] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [studentId, setStudentId] = useState('');
  const [subject, setSubject] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [formExamType, setFormExamType] = useState('quiz');
  const [examDate, setExamDate] = useState('');
  const [remarks, setRemarks] = useState('');

  const fetchGrades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/grades');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load grades');
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setItems([]);
      toast.error(e instanceof Error ? e.message : 'Failed to load grades');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/students');
        const data = await res.json();
        if (Array.isArray(data)) {
          setStudents(
            data.map((s: StudentOption & { id: string }) => ({
              id: s.id,
              full_name: s.full_name,
              student_code: s.student_code,
            }))
          );
        }
      } catch (e) {
        setStudents([]);
        toast.error(e instanceof Error ? e.message : 'Failed to load students');
      }
    })();
  }, []);

  const filterFn = useCallback(
    (item: GradeRow) =>
      (!status || item.status === status) && (!examType || item.exam_type === examType),
    [status, examType]
  );

  const list = useListQuery({
    items,
    searchKeys: ['student_name', 'student_code', 'subject', 'exam_name', 'letter'],
    filterKey: `${status}|${examType}`,
    filterFn,
  });

  const statusOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.status).filter(Boolean));
    return [...set].map((s) => ({ value: s, label: s }));
  }, [items]);

  const examTypeOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.exam_type).filter(Boolean) as string[]);
    return [...set].map((s) => ({ value: s, label: s }));
  }, [items]);

  const studentOptions = useMemo(
    () =>
      students.map((s) => ({
        value: s.id,
        label: s.student_code ? `${s.full_name} (${s.student_code})` : s.full_name,
      })),
    [students]
  );

  const avg =
    items.length === 0
      ? 0
      : items.reduce((sum, r) => sum + Number(r.percentage ?? 0), 0) / items.length;
  const top = items.reduce(
    (best, r) => (Number(r.percentage ?? 0) > Number(best?.percentage ?? 0) ? r : best),
    items[0] as GradeRow | undefined
  );
  const discountEligible = items.filter((r) => Number(r.percentage ?? 0) >= 90).length;

  const openAdd = () => {
    setStudentId('');
    setSubject('');
    setScore('');
    setMaxScore('100');
    setFormExamType('quiz');
    setExamDate(new Date().toISOString().slice(0, 10));
    setRemarks('');
    setFormError(null);
    setShowAdd(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const scoreNum = Number(score);
    const maxNum = Number(maxScore) || 100;
    if (!studentId) {
      setFormError('Please select a student');
      toast.error('Please select a student');
      return;
    }
    if (!subject.trim()) {
      setFormError('Subject is required');
      toast.error('Subject is required');
      return;
    }
    if (Number.isNaN(scoreNum)) {
      setFormError('Score must be a number');
      toast.error('Score must be a number');
      return;
    }

    setSubmitting(true);
    try {
      const pct = (scoreNum / maxNum) * 100;
      const res = await fetch('/api/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          subject: subject.trim(),
          score: scoreNum,
          max_score: maxNum,
          exam_type: formExamType,
          exam_date: examDate || null,
          remarks: remarks.trim() || null,
          grade: letterFromPercent(pct),
          status: 'graded',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add grade');
      setShowAdd(false);
      toast.success('Grade added successfully');
      await fetchGrades();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add grade';
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ListPageShell
        title="Grade"
        description="Student exam scores, percentages, and letter grades"
        primaryAction={{ label: 'Add Grade', onClick: openAdd }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search student, subject, grade…"
        onResetFilters={() => {
          list.reset();
          setStatus('');
          setExamType('');
        }}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: status,
            options: statusOptions.length
              ? statusOptions
              : [
                  { value: 'pending', label: 'pending' },
                  { value: 'graded', label: 'graded' },
                  { value: 'reviewed', label: 'reviewed' },
                ],
            onChange: setStatus,
          },
          {
            key: 'exam_type',
            label: 'Exam type',
            value: examType,
            options: examTypeOptions.length
              ? examTypeOptions
              : [
                  { value: 'quiz', label: 'quiz' },
                  { value: 'midterm', label: 'midterm' },
                  { value: 'final', label: 'final' },
                ],
            onChange: setExamType,
          },
        ]}
        loading={loading}
        columns={[
          {
            key: 'student_name',
            header: 'Student',
            render: (r) => (
              <div>
                <div className="font-semibold">{r.student_name}</div>
                {r.student_code && (
                  <div className="text-xs text-muted-foreground">{r.student_code}</div>
                )}
              </div>
            ),
          },
          {
            key: 'subject',
            header: 'Subject / Exam',
            render: (r) => (
              <div>
                <div>{r.subject}</div>
                <div className="text-xs text-muted-foreground">
                  {[r.exam_type, r.exam_date].filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
            ),
          },
          {
            key: 'score',
            header: 'Score',
            align: 'right',
            render: (r) => (r.score != null ? `${r.score}/${r.max_score ?? 100}` : '—'),
          },
          {
            key: 'percentage',
            header: '%',
            align: 'right',
            render: (r) =>
              r.percentage != null ? `${Number(r.percentage).toFixed(1)}%` : '—',
          },
          {
            key: 'letter',
            header: 'Grade',
            render: (r) =>
              r.letter ? (
                <StatusChip label={String(r.letter)} tone={letterTone(r.letter)} />
              ) : (
                '—'
              ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <StatusChip label={r.status} tone={statusToneFromValue(r.status)} />
            ),
          },
        ]}
        rows={list.rows}
        rowKey={(r) => r.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No grades found. Click Add Grade to create one."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-1">
          <StatCard
            label="Class average"
            value={`${avg.toFixed(1)}%`}
            hint="All loaded grades"
            valueClassName="text-sky-500"
          />
          <StatCard
            label="Top performer"
            value={top?.student_name || '—'}
            hint={top ? `${Number(top.percentage ?? 0).toFixed(0)}%` : 'No data'}
            valueClassName="text-[20px]"
          />
          <StatCard
            label="Discount eligible"
            value={discountEligible}
            hint="90%+ scores"
            valueClassName="text-emerald-500"
          />
        </div>
      </ListPageShell>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="emis-dialog bg-popover text-popover-foreground w-full max-w-lg rounded-xl border border-border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-lg font-semibold">Add Grade</h3>
              <button type="button" onClick={() => setShowAdd(false)} aria-label="Close">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="px-5 py-4 space-y-4">
              <Dropdown
                label="Student *"
                value={studentId}
                onChange={setStudentId}
                options={studentOptions}
                placeholder="Select student"
                filter
              />
              <InputField
                label="Subject"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. English, Math"
              />
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Score"
                  required
                  type="number"
                  min={0}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                />
                <InputField
                  label="Max score"
                  type="number"
                  min={1}
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Dropdown
                  label="Exam type"
                  value={formExamType}
                  onChange={setFormExamType}
                  options={[
                    { value: 'quiz', label: 'Quiz' },
                    { value: 'midterm', label: 'Midterm' },
                    { value: 'final', label: 'Final' },
                    { value: 'assignment', label: 'Assignment' },
                  ]}
                  filter={false}
                />
                <InputField
                  label="Exam date"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </div>
              <InputField
                label="Remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional"
              />

              {score && maxScore && !Number.isNaN(Number(score)) && (
                <p className="text-xs text-muted-foreground">
                  Preview: {((Number(score) / (Number(maxScore) || 100)) * 100).toFixed(1)}% ?{' '}
                  {letterFromPercent((Number(score) / (Number(maxScore) || 100)) * 100)}
                </p>
              )}

              {formError && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <PortButton variant="ghost" type="button" onClick={() => setShowAdd(false)}>
                  Cancel
                </PortButton>
                <PortButton variant="primary" type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Add Grade'}
                </PortButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
