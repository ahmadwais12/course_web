'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Dropdown,
  EmptyState,
  ErrorBanner,
  Filter,
  FormDialog,
  FormDialogFooter,
  InputField,
  PageHeader,
  PortButton,
  RowActions,
  SectionPanel,
  StatCard,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';

type LessonRow = {
  id: string;
  classId: string | null;
  className: string;
  subjectId: string | null;
  subject: string;
  teacherId: string | null;
  teacher: string;
  roomId: string | null;
  room: string;
  day: number;
  startTime: string | null;
  endTime: string | null;
  isActive: boolean;
};

type FormState = {
  classId: string;
  subjectId: string;
  teacherId: string;
  roomId: string;
  day: string;
  startTime: string;
  endTime: string;
};

const DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

const emptyForm = (): FormState => ({
  classId: '',
  subjectId: '',
  teacherId: '',
  roomId: '',
  day: '1',
  startTime: '08:00',
  endTime: '09:00',
});

export default function TimetablePage() {
  const [rows, setRows] = useState<LessonRow[]>([]);
  const [classes, setClasses] = useState<{ value: string; label: string }[]>([]);
  const [subjects, setSubjects] = useState<{ value: string; label: string }[]>([]);
  const [teachers, setTeachers] = useState<{ value: string; label: string }[]>([]);
  const [rooms, setRooms] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/academic/timetable');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load timetable');
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setClasses(Array.isArray(data.classes) ? data.classes : []);
      setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
      setTeachers(Array.isArray(data.teachers) ? data.teachers : []);
      setRooms(Array.isArray(data.rooms) ? data.rooms : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load timetable';
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (classFilter && row.classId !== classFilter) return false;
      if (teacherFilter && row.teacherId !== teacherFilter) return false;
      if (dayFilter && row.day !== Number(dayFilter)) return false;
      if (!q) return true;
      return [row.className, row.subject, row.teacher, row.room]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, classFilter, teacherFilter, dayFilter]);

  const stats = useMemo(
    () => ({
      lessons: rows.length,
      classes: new Set(rows.map((row) => row.classId).filter(Boolean)).size,
      teachers: new Set(rows.map((row) => row.teacherId).filter(Boolean)).size,
      rooms: new Set(rows.map((row) => row.roomId).filter(Boolean)).size,
    }),
    [rows]
  );

  const openCreate = () => {
    setForm({ ...emptyForm(), classId: classFilter, day: dayFilter || '1' });
    setFormError(null);
    setOpen(true);
  };

  const remove = async (row: LessonRow) => {
    try {
      const res = await fetch(`/api/academic/timetable?id=${encodeURIComponent(row.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove lesson');
      toast.success('Lesson removed');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove lesson');
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.startTime || !form.endTime) {
      setFormError('Choose the lesson start and end time');
      return;
    }
    if (form.endTime <= form.startTime) {
      setFormError('End time must be after the start time');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/academic/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, day: Number(form.day) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add lesson');
      toast.success('Lesson added to the timetable');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to add lesson');
    } finally {
      setSaving(false);
    }
  };

  const visibleDays = DAYS.filter((day) => !dayFilter || day.value === Number(dayFilter));

  return (
    <div className="min-w-0 space-y-4 animate-fade-up">
      <PageHeader
        title="Timetable"
        description="Weekly lesson schedule by class, teacher, and room."
        pill={loading ? 'LOADING…' : 'LIVE DATA'}
        pillTone={loading ? 'neutral' : 'live'}
        actions={
          <PortButton variant="primary" onClick={openCreate}>
            Add Lesson
          </PortButton>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Lessons per week" value={stats.lessons} accent="blue" />
        <StatCard label="Classes scheduled" value={stats.classes} accent="green" />
        <StatCard label="Teachers scheduled" value={stats.teachers} accent="gold" />
        <StatCard label="Rooms in use" value={stats.rooms} accent="purple" />
      </div>

      {error && <ErrorBanner message={error} />}

      <Filter
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search class, subject, teacher, or room…"
        filters={[
          { key: 'class', label: 'Class', value: classFilter, options: classes, onChange: setClassFilter },
          { key: 'teacher', label: 'Teacher', value: teacherFilter, options: teachers, onChange: setTeacherFilter },
          {
            key: 'day',
            label: 'Weekday',
            value: dayFilter,
            options: DAYS.map((day) => ({ value: String(day.value), label: day.label })),
            onChange: setDayFilter,
          },
        ]}
        onReset={() => {
          setSearch('');
          setClassFilter('');
          setTeacherFilter('');
          setDayFilter('');
        }}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {visibleDays.map((day) => {
          const lessons = filtered
            .filter((row) => row.day === day.value)
            .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
          return (
            <SectionPanel key={day.value} title={day.label} description={`${lessons.length} lessons`}>
              {lessons.length === 0 ? (
                <EmptyState message={`No lessons scheduled for ${day.label.toLowerCase()}.`} />
              ) : (
                <ul className="m-0 list-none space-y-2 p-0">
                  {lessons.map((lesson) => (
                    <li
                      key={lesson.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                          <span className="tabular-nums">
                            {lesson.startTime?.slice(0, 5) ?? '—'} – {lesson.endTime?.slice(0, 5) ?? '—'}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span>{lesson.subject}</span>
                        </div>
                        <p className="m-0 mt-0.5 truncate text-xs text-muted-foreground">
                          {[lesson.className, lesson.teacher, lesson.room].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <RowActions
                        overflow={[
                          {
                            key: 'delete',
                            label: 'Remove lesson',
                            icon: <Trash2 size={16} />,
                            onClick: () => void remove(lesson),
                            danger: true,
                          },
                        ]}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </SectionPanel>
          );
        })}
      </div>

      <FormDialog
        open={open}
        title="Add Lesson"
        onClose={() => setOpen(false)}
        maxWidth="xl"
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel="Add lesson"
            submitting={saving}
            formId="lesson-form"
          />
        }
      >
        <form id="lesson-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Dropdown
              label="Class"
              value={form.classId}
              onChange={(value) => setForm((prev) => ({ ...prev, classId: value }))}
              options={classes}
              placeholder="Any class"
              clearable
            />
            <Dropdown
              label="Subject"
              value={form.subjectId}
              onChange={(value) => setForm((prev) => ({ ...prev, subjectId: value }))}
              options={subjects}
              placeholder="Any subject"
              clearable
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Dropdown
              label="Teacher"
              value={form.teacherId}
              onChange={(value) => setForm((prev) => ({ ...prev, teacherId: value }))}
              options={teachers}
              placeholder="Not assigned"
              clearable
            />
            <Dropdown
              label="Room"
              value={form.roomId}
              onChange={(value) => setForm((prev) => ({ ...prev, roomId: value }))}
              options={rooms}
              placeholder="Not assigned"
              clearable
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Dropdown
              label="Weekday"
              required
              value={form.day}
              onChange={(value) => setForm((prev) => ({ ...prev, day: value }))}
              options={DAYS.map((day) => ({ value: String(day.value), label: day.label }))}
            />
            <InputField
              label="Start time"
              required
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
            />
            <InputField
              label="End time"
              required
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
            />
          </div>
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>
    </div>
  );
}
