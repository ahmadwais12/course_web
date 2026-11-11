'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Award,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Download,
  Mail,
  MessageSquare,
  Plus,
  School,
  Send,
  Users,
} from 'lucide-react';
import { StatusChip, statusToneFromValue } from '@/components/ports';
import StatCard from '@/components/ports/StatCard';
import DataTable, { type DataColumn } from '@/components/ports/DataTable';
import SectionPanel from '@/components/ports/SectionPanel';
import PageHeader from '@/components/ports/PageHeader';
import EmptyState from '@/components/ports/EmptyState';
import PortButton from '@/components/ports/PortButton';
import Dropdown from '@/components/ports/Dropdown';
import SearchBar from '@/components/ports/SearchBar';
import SegmentedControl from '@/components/ports/SegmentedControl';
import InputField, { TextAreaField } from '@/components/ports/InputField';
import FormDialog, { FormDialogFooter } from '@/components/ports/FormDialog';
import { toast } from '@/components/ui/Toast';
import { usePortalData } from '@/components/portal/PortalDataContext';
import type {
  PortalExam,
  PortalMaterial,
  PortalTeacherData,
  PortalTeacherStudent,
  PortalTeacherSubmission,
} from '@/lib/portal-types';
import {
  DAY_NAMES,
  DAY_SHORT,
  InfoRow,
  PortalError,
  PortalLoading,
  ProgressBar,
  formatDate,
  formatTime,
  groupByDay,
  initials,
} from '@/components/portal/PortalUi';

export function TeacherGate({ children }: { children: (data: PortalTeacherData) => React.ReactNode }) {
  const { data, loading, error, refresh } = usePortalData('teacher');

  if (loading) return <PortalLoading />;
  if (error) return <PortalError message={error} onRetry={refresh} />;
  if (!data) return <PortalError message="No portal response was returned." onRetry={refresh} />;
  return <>{children(data)}</>;
}

function todayDayNumber() {
  return ((new Date().getDay() + 6) % 7) + 1;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function TeacherAvatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/50" />;
  }
  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold text-white ring-2 ring-white/40">
      {initials(name)}
    </span>
  );
}

export function TeacherDashboardScreen() {
  return (
    <TeacherGate>
      {(data) => {
        const teacher = data.teacher;
        const todaySlots = data.timetable.filter((slot) => Number(slot.dayOfWeek) === todayDayNumber());
        const pendingSubmissions = data.submissions
          .filter((row) => row.status === 'submitted' || row.status === 'late')
          .slice(0, 6);
        const upcomingExams = data.exams
          .filter((exam) => exam.examDate && exam.examDate >= todayIso() && exam.status !== 'cancelled')
          .sort((a, b) => String(a.examDate).localeCompare(String(b.examDate)))
          .slice(0, 5);
        const classPerformance = data.classes.map((cls) => {
          const classStudents = data.students.filter((student) => student.classId === cls.id);
          const attendance = classStudents.length
            ? Math.round(
                classStudents.reduce((sum, student) => sum + student.attendancePercentage, 0) /
                  classStudents.length
              )
            : 0;
          const grade = classStudents.length
            ? classStudents.reduce((sum, student) => sum + student.averageGrade, 0) / classStudents.length
            : 0;
          return { ...cls, attendance, grade };
        });

        return (
          <div className="space-y-4 p-1">
            <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-5 text-white shadow-card sm:p-6">
              <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex flex-wrap items-center gap-4">
                <TeacherAvatar name={teacher?.fullName || data.profile.name} url={teacher?.photoUrl || data.profile.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Teach today, shape tomorrow</p>
                  <h1 className="truncate text-2xl font-bold leading-tight sm:text-3xl">
                    {teacher?.fullName || data.profile.name}
                  </h1>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/80">
                    <span className="inline-flex items-center gap-1">
                      <School size={13} /> {data.classes.length} classes
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users size={13} /> {data.students.length} students
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BookOpen size={13} /> {data.stats.subjects} subjects
                    </span>
                  </p>
                </div>
                <Link
                  href="/teacher/attendance"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/25"
                >
                  Take attendance
                </Link>
              </div>
            </article>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
              <StatCard label="Classes" value={data.stats.classes} accent="green" />
              <StatCard label="Students" value={data.stats.students} accent="blue" />
              <StatCard label="Subjects" value={data.stats.subjects} accent="purple" />
              <StatCard label="Attendance pending" value={data.attendance.pendingClasses.length} hint="Classes today" accent="gold" />
              <StatCard label="Reviews pending" value={data.stats.pendingReview} hint="Submissions" accent="gold" />
              <StatCard label="Upcoming exams" value={upcomingExams.length} accent="purple" />
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <SectionPanel title="Today's teaching" description={DAY_NAMES[todayDayNumber() - 1]} headerRight={<Link href="/teacher/schedule" className="text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-300">Week</Link>}>
                {todaySlots.length ? (
                  <ul className="space-y-2">
                    {todaySlots.map((slot) => (
                      <li key={slot.id} className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">
                          <BookOpen size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{slot.subjectName || 'Subject'}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {slot.className || 'Class'}
                            {slot.roomName ? ` · ${slot.roomName}` : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                          {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState message="No teaching slots scheduled for today." />
                )}
              </SectionPanel>

              <SectionPanel title="Attendance tasks" description="Classes without attendance today" headerRight={<Link href="/teacher/attendance" className="text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-300">Open</Link>}>
                {data.attendance.pendingClasses.length ? (
                  <ul className="space-y-2">
                    {data.attendance.pendingClasses.map((cls) => (
                      <li key={cls.classId} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
                        <ClipboardCheck size={16} className="text-amber-600" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{cls.className}</p>
                          <p className="text-[11px] text-muted-foreground">{cls.studentCount} students</p>
                        </div>
                        <StatusChip label="pending" tone="gold" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState message="Attendance is up to date for today." />
                )}
              </SectionPanel>

              <SectionPanel title="Pending reviews" description="Student submissions" headerRight={<Link href="/teacher/assignments" className="text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-300">All</Link>}>
                {pendingSubmissions.length ? (
                  <ul className="divide-y divide-border">
                    {pendingSubmissions.map((row) => (
                      <li key={row.id} className="flex items-center gap-2 py-2.5 first:pt-0 last:pb-0">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200">
                          <ClipboardList size={15} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{row.studentName}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{row.homeworkTitle}</p>
                        </div>
                        <StatusChip label={row.status || 'submitted'} tone={statusToneFromValue(row.status || 'submitted')} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState message="Nothing waiting for review." />
                )}
              </SectionPanel>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <SectionPanel title="Class performance" description="Average attendance and grade per class">
                {classPerformance.length ? (
                  <div className="space-y-3">
                    {classPerformance.map((cls) => (
                      <div key={cls.id}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                          <span className="truncate font-semibold">{cls.name}</span>
                          <span className="text-muted-foreground">
                            {cls.attendance}% · {cls.grade.toFixed(1)} grade
                          </span>
                        </div>
                        <ProgressBar value={cls.attendance} tone="bg-emerald-500" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No classes are assigned to you yet." />
                )}
              </SectionPanel>

              <SectionPanel title="Upcoming examinations">
                {upcomingExams.length ? (
                  <ul className="divide-y divide-border">
                    {upcomingExams.map((exam) => (
                      <li key={exam.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                        <Award size={16} className="shrink-0 text-emerald-600 dark:text-emerald-300" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{exam.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {exam.className || 'Class'} · {formatDate(exam.examDate)}
                          </p>
                        </div>
                        <StatusChip label={exam.status || 'scheduled'} tone={statusToneFromValue(exam.status || 'scheduled')} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState message="No upcoming examinations." />
                )}
              </SectionPanel>
            </div>

            <SectionPanel title="Quick links">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { href: '/teacher/students', label: 'My students', icon: Users },
                  { href: '/teacher/assignments', label: 'Assignments', icon: ClipboardList },
                  { href: '/messaging', label: 'Messages', icon: MessageSquare },
                  { href: '/notifications', label: 'Notifications', icon: Mail },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background px-2 py-4 text-center text-xs font-semibold text-foreground transition hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  >
                    <link.icon size={18} className="text-emerald-600 dark:text-emerald-300" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </SectionPanel>
          </div>
        );
      }}
    </TeacherGate>
  );
}

export function TeacherProfileScreen() {
  return (
    <TeacherGate>
      {(data) => {
        const teacher = data.teacher;
        return (
          <div className="space-y-4 p-1">
            <PageHeader title="My Profile" description="Your employment and teaching details." />
            <div className="grid gap-4 lg:grid-cols-3">
              <SectionPanel title="Teacher identity">
                <div className="flex items-center gap-3">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                    {initials(teacher?.fullName || data.profile.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold">{teacher?.fullName || data.profile.name}</p>
                    <p className="text-xs text-muted-foreground">{teacher?.employeeCode || '—'}</p>
                    <div className="mt-1">
                      <StatusChip label={teacher?.status || 'active'} tone={statusToneFromValue(teacher?.status || 'active')} />
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <InfoRow label="Email" value={teacher?.email || data.profile.email} />
                  <InfoRow label="Phone" value={teacher?.phone || data.profile.phone} />
                  <InfoRow label="Department" value={teacher?.departmentName} />
                  <InfoRow label="Qualification" value={teacher?.qualification} />
                  <InfoRow label="Specialization" value={teacher?.specialization} />
                  <InfoRow label="Join date" value={formatDate(teacher?.joinDate)} />
                </div>
              </SectionPanel>
              <SectionPanel title="Assigned classes" className="lg:col-span-2">
                {data.classes.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.classes.map((cls) => (
                      <article key={cls.id} className="rounded-xl border border-border bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-bold">{cls.name}</p>
                          <StatusChip label={cls.isClassTeacher ? 'class teacher' : 'subject teacher'} tone={cls.isClassTeacher ? 'green' : 'blue'} />
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {cls.studentCount} students{cls.grade ? ` · Grade ${cls.grade}` : ''}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {cls.subjects.map((subject) => (
                            <span key={subject.id} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              {subject.name}
                            </span>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No classes are assigned to you yet." />
                )}
              </SectionPanel>
            </div>
          </div>
        );
      }}
    </TeacherGate>
  );
}

export function TeacherClassesScreen() {
  return (
    <TeacherGate>
      {(data) => (
        <div className="space-y-4 p-1">
          <PageHeader title="My Classes" description="Classes and subjects assigned to you." />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Classes" value={data.classes.length} accent="green" />
            <StatCard label="Students" value={data.students.length} accent="blue" />
            <StatCard label="Subjects" value={data.stats.subjects} accent="purple" />
            <StatCard label="Class teacher" value={data.classes.filter((cls) => cls.isClassTeacher).length} accent="gold" />
          </div>
          <SectionPanel title="Assigned classes">
            {data.classes.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.classes.map((cls) => {
                  const classStudents = data.students.filter((student) => student.classId === cls.id);
                  return (
                    <article key={cls.id} className="rounded-2xl border border-border bg-background p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold">{cls.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {cls.grade || '—'} · {cls.studentCount} students
                          </p>
                        </div>
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">
                          <School size={18} />
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {cls.subjects.length ? (
                          cls.subjects.map((subject) => (
                            <span key={subject.id} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              {subject.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-muted-foreground">No subjects linked</span>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
                        <span>{classStudents.length} enrolled</span>
                        <Link href="/teacher/students" className="font-semibold text-emerald-600 hover:underline dark:text-emerald-300">
                          View students
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState message="No classes are assigned to you yet." />
            )}
          </SectionPanel>
        </div>
      )}
    </TeacherGate>
  );
}

export function TeacherStudentsScreen() {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  return (
    <TeacherGate>
      {(data) => {
        const classOptions = [
          { value: 'all', label: 'All classes' },
          ...data.classes.map((cls) => ({ value: cls.id, label: cls.name })),
        ];
        const rows = data.students.filter((student) => {
          const matchesClass = classFilter === 'all' || student.classId === classFilter;
          const query = search.trim().toLowerCase();
          const matchesSearch =
            !query ||
            student.fullName.toLowerCase().includes(query) ||
            student.studentCode.toLowerCase().includes(query);
          return matchesClass && matchesSearch;
        });

        const columns: DataColumn<PortalTeacherStudent>[] = [
          {
            key: 'name',
            header: 'Student',
            render: (row) => (
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">
                  {initials(row.fullName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{row.fullName}</p>
                  <p className="text-[11px] text-muted-foreground">{row.studentCode}</p>
                </div>
              </div>
            ),
          },
          { key: 'class', header: 'Class', render: (row) => row.className || '—' },
          { key: 'attendance', header: 'Attendance', align: 'right', render: (row) => `${row.attendancePercentage}%` },
          { key: 'grade', header: 'Average grade', align: 'right', render: (row) => (row.averageGrade ? row.averageGrade.toFixed(1) : '—') },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusChip label={row.status || 'active'} tone={statusToneFromValue(row.status || 'active')} />,
          },
        ];

        return (
          <div className="space-y-4 p-1">
            <PageHeader title="My Students" description="Students enrolled in your assigned classes." />
            <SectionPanel
              title="Student directory"
              headerRight={
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <SearchBar value={search} onChange={setSearch} placeholder="Search name or code…" className="sm:w-64" />
                  <SegmentedControl value={classFilter} onChange={setClassFilter} options={classOptions} />
                </div>
              }
            >
              <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} emptyMessage="No students match this view." />
            </SectionPanel>
          </div>
        );
      }}
    </TeacherGate>
  );
}

export function TeacherScheduleScreen() {
  return (
    <TeacherGate>
      {(data) => {
        const days = groupByDay(data.timetable);
        return (
          <div className="space-y-4 p-1">
            <PageHeader title="Teaching Schedule" description="Weekly timetable across your assigned classes." />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Weekly slots" value={data.timetable.length} accent="green" />
              <StatCard label="Classes" value={data.classes.length} accent="blue" />
              <StatCard label="Today" value={DAY_SHORT[todayDayNumber() - 1]} accent="purple" />
              <StatCard label="Subjects" value={data.stats.subjects} accent="gold" />
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {days.map((day) => (
                <SectionPanel
                  key={day.day}
                  title={day.name}
                  description={day.slots.length ? `${day.slots.length} class${day.slots.length === 1 ? '' : 'es'}` : 'No classes'}
                  className={day.day === todayDayNumber() ? 'ring-2 ring-emerald-400/60' : undefined}
                >
                  {day.slots.length ? (
                    <ul className="space-y-2">
                      {day.slots.map((slot) => (
                        <li key={slot.id} className="rounded-xl border border-border bg-background px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold">{slot.subjectName || 'Subject'}</p>
                            <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                              {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {slot.className || 'Class'}
                            {slot.roomName ? ` · ${slot.roomName}` : ''}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-4 text-center text-xs text-muted-foreground">No classes scheduled.</p>
                  )}
                </SectionPanel>
              ))}
            </div>
          </div>
        );
      }}
    </TeacherGate>
  );
}

export function TeacherAttendanceScreen() {
  const { refresh } = usePortalData('teacher');
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(todayIso());
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  return (
    <TeacherGate>
      {(data) => {
        const activeClass = data.classes.find((cls) => cls.id === classId) ?? data.classes[0] ?? null;
        const activeClassId = activeClass?.id ?? '';
        const classStudents = activeClass
          ? data.students.filter((student) => student.classId === activeClass.id)
          : [];

        const setStatus = (studentId: string, status: string) =>
          setStatuses((current) => ({ ...current, [studentId]: status }));

        const markAll = (status: string) =>
          setStatuses(Object.fromEntries(classStudents.map((student) => [student.id, status])));

        const submit = async () => {
          if (!activeClassId) return;
          setSubmitting(true);
          setLastResult(null);
          try {
            const records = classStudents.map((student) => ({
              studentId: student.id,
              status: statuses[student.id] || 'present',
            }));
            const response = await fetch('/api/portal/teacher/attendance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ classId: activeClassId, date, records }),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body?.error || 'Attendance could not be saved');
            setLastResult(
              `Saved for ${activeClass?.name} on ${formatDate(date)} — ${body.inserted ?? 0} new, ${body.updated ?? 0} updated.`
            );
            toast.success('Attendance saved');
            refresh();
          } catch (cause) {
            toast.error(cause instanceof Error ? cause.message : 'Attendance could not be saved');
          } finally {
            setSubmitting(false);
          }
        };

        return (
          <div className="space-y-4 p-1">
            <PageHeader title="Take Attendance" description="Record daily attendance for one of your assigned classes." />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Marked today" value={data.attendance.todayDone} hint="Student records" accent="green" />
              <StatCard label="Pending classes" value={data.attendance.pendingClasses.length} accent="gold" />
              <StatCard label="Present" value={data.attendance.summary.present} accent="blue" />
              <StatCard label="Absent" value={data.attendance.summary.absent} accent="purple" />
            </div>

            {data.attendance.pendingClasses.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="font-semibold">Attendance is still pending for:</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {data.attendance.pendingClasses.map((cls) => (
                    <button
                      key={cls.classId}
                      type="button"
                      onClick={() => {
                        setClassId(cls.classId);
                        setStatuses({});
                      }}
                      className="rounded-full border border-amber-300 bg-white/70 px-2.5 py-0.5 font-semibold hover:bg-white dark:bg-amber-900/40"
                    >
                      {cls.className}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <SectionPanel title="Attendance sheet">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Dropdown
                  label="Class"
                  value={activeClassId}
                  onChange={(value) => {
                    setClassId(value);
                    setStatuses({});
                    setLastResult(null);
                  }}
                  options={data.classes.map((cls) => ({ value: cls.id, label: cls.name }))}
                  placeholder="Select a class"
                />
                <InputField
                  label="Date"
                  type="date"
                  value={date}
                  max={todayIso()}
                  onChange={(event) => setDate(event.target.value)}
                />
                <div className="flex items-end gap-2">
                  <PortButton onClick={() => markAll('present')}>All present</PortButton>
                  <PortButton variant="ghost" onClick={() => markAll('absent')}>
                    All absent
                  </PortButton>
                </div>
              </div>

              {activeClass ? (
                classStudents.length ? (
                  <>
                    <div className="mt-4 divide-y divide-border rounded-xl border border-border">
                      {classStudents.map((student) => (
                        <div key={student.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-[11px] font-bold text-muted-foreground">
                              {initials(student.fullName)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{student.fullName}</p>
                              <p className="text-[11px] text-muted-foreground">{student.studentCode}</p>
                            </div>
                          </div>
                          <SegmentedControl
                            value={statuses[student.id] || 'present'}
                            onChange={(value) => setStatus(student.id, value)}
                            options={[
                              { value: 'present', label: 'Present' },
                              { value: 'absent', label: 'Absent' },
                              { value: 'late', label: 'Late' },
                              { value: 'excused', label: 'Excused' },
                            ]}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {lastResult || 'Existing records for the selected date are updated, not duplicated.'}
                      </p>
                      <PortButton variant="primary" onClick={() => void submit()} disabled={submitting}>
                        <Send size={15} />
                        {submitting ? 'Saving…' : 'Save attendance'}
                      </PortButton>
                    </div>
                  </>
                ) : (
                  <EmptyState message="No students are enrolled in this class." />
                )
              ) : (
                <EmptyState message="No classes are assigned to you yet." />
              )}
            </SectionPanel>
          </div>
        );
      }}
    </TeacherGate>
  );
}

export function TeacherAssignmentsScreen() {
  const { refresh } = usePortalData('teacher');
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxMarks, setMaxMarks] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <TeacherGate>
      {(data) => {
        const selectedClass = data.classes.find((cls) => cls.id === classId) ?? null;
        const subjectOptions = selectedClass
          ? selectedClass.subjects.map((subject) => ({ value: subject.id, label: subject.name }))
          : [];

        const reset = () => {
          setOpen(false);
          setClassId('');
          setSubjectId('');
          setTitle('');
          setDescription('');
          setDueDate('');
          setMaxMarks('');
        };

        const create = async () => {
          setSaving(true);
          try {
            const response = await fetch('/api/portal/teacher/assignments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                classId,
                subjectId: subjectId || null,
                title,
                description,
                dueDate,
                maxMarks: maxMarks || null,
              }),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body?.error || 'Assignment could not be created');
            toast.success('Assignment published');
            reset();
            refresh();
          } catch (cause) {
            toast.error(cause instanceof Error ? cause.message : 'Assignment could not be created');
          } finally {
            setSaving(false);
          }
        };

        const columns: DataColumn<PortalTeacherData['assignments'][number]>[] = [
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
          { key: 'class', header: 'Class', render: (row) => row.className || '—' },
          { key: 'due', header: 'Due', render: (row) => formatDate(row.dueDate) },
          { key: 'max', header: 'Max marks', render: (row) => row.maxMarks ?? '—' },
          { key: 'submissions', header: 'Submissions', align: 'right', render: (row) => row.submissionCount },
          {
            key: 'pending',
            header: 'Pending review',
            align: 'right',
            render: (row) => (
              <StatusChip label={String(row.pendingReview)} tone={row.pendingReview > 0 ? 'gold' : 'green'} />
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusChip label={row.status || 'active'} tone={statusToneFromValue(row.status || 'active')} />,
          },
          {
            key: 'file',
            header: 'Attachment',
            render: (row) =>
              row.attachmentUrl ? (
                <a href={row.attachmentUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-300">
                  Open
                </a>
              ) : (
                '—'
              ),
          },
        ];

        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Assignments"
              description="Publish assignments for your classes and track submissions."
              actions={
                <PortButton variant="primary" onClick={() => setOpen(true)} disabled={!data.classes.length}>
                  <Plus size={15} /> New assignment
                </PortButton>
              }
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Assignments" value={data.assignments.length} accent="green" />
              <StatCard label="Pending review" value={data.stats.pendingReview} accent="gold" />
              <StatCard label="Submissions" value={data.submissions.length} accent="blue" />
              <StatCard label="Classes" value={data.classes.length} accent="purple" />
            </div>

            <SectionPanel title="Published assignments">
              <DataTable columns={columns} rows={data.assignments} rowKey={(row) => row.id} emptyMessage="No assignments published yet." />
            </SectionPanel>

            <SectionPanel title="Recent submissions" description="Latest student submissions across your classes.">
              {data.submissions.length ? (
                <div className="divide-y divide-border">
                  {data.submissions.slice(0, 15).map((row: PortalTeacherSubmission) => (
                    <div key={row.id} className="flex flex-wrap items-center gap-2 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {row.studentName} · {row.homeworkTitle}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {row.className || 'Class'} · submitted {formatDate(row.submittedAt)}
                        </p>
                      </div>
                      <StatusChip label={row.status || 'submitted'} tone={statusToneFromValue(row.status || 'submitted')} />
                      {row.submissionUrl && (
                        <a href={row.submissionUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-300">
                          File
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No submissions yet." />
              )}
            </SectionPanel>

            <FormDialog
              open={open}
              title="New assignment"
              onClose={reset}
              footer={
                <FormDialogFooter
                  onCancel={reset}
                  submitLabel="Publish"
                  submitting={saving}
                  formId="teacher-assignment-form"
                  disabled={!classId || !title.trim() || !dueDate}
                />
              }
            >
              <form
                id="teacher-assignment-form"
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void create();
                }}
              >
                <Dropdown
                  label="Class"
                  required
                  value={classId}
                  onChange={(value) => {
                    setClassId(value);
                    setSubjectId('');
                  }}
                  options={data.classes.map((cls) => ({ value: cls.id, label: cls.name }))}
                  placeholder="Select class"
                />
                <Dropdown
                  label="Subject"
                  value={subjectId}
                  onChange={setSubjectId}
                  options={subjectOptions}
                  placeholder={selectedClass ? 'Optional subject' : 'Select a class first'}
                  disabled={!selectedClass}
                  clearable
                />
                <InputField
                  label="Title"
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Algebra practice set 3"
                />
                <TextAreaField
                  label="Description"
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Instructions for students…"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <InputField
                    label="Due date"
                    type="date"
                    required
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                  <InputField
                    label="Max marks"
                    type="number"
                    min="0"
                    value={maxMarks}
                    onChange={(event) => setMaxMarks(event.target.value)}
                    placeholder="e.g. 20"
                  />
                </div>
              </form>
            </FormDialog>
          </div>
        );
      }}
    </TeacherGate>
  );
}

export function TeacherExamsScreen() {
  return (
    <TeacherGate>
      {(data) => {
        const columns: DataColumn<PortalExam>[] = [
          {
            key: 'name',
            header: 'Examination',
            render: (row) => (
              <div className="min-w-[180px]">
                <p className="font-semibold">{row.name}</p>
                <p className="text-[11px] text-muted-foreground">{row.examType || 'Exam'}</p>
              </div>
            ),
          },
          { key: 'subject', header: 'Subject', render: (row) => row.subject || '—' },
          { key: 'class', header: 'Class', render: (row) => row.className || '—' },
          { key: 'date', header: 'Date', render: (row) => formatDate(row.examDate) },
          { key: 'time', header: 'Time', render: (row) => (row.startTime ? `${formatTime(row.startTime)}–${formatTime(row.endTime)}` : '—') },
          { key: 'marks', header: 'Total / Passing', render: (row) => `${row.totalMarks ?? '—'} / ${row.passingMarks ?? '—'}` },
          { key: 'status', header: 'Status', render: (row) => <StatusChip label={row.status || 'scheduled'} tone={statusToneFromValue(row.status || 'scheduled')} /> },
        ];
        const upcoming = data.exams.filter((exam) => exam.examDate && exam.examDate >= todayIso());
        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Examinations"
              description="Scheduled examinations for your assigned classes. Marks are managed in the academic workspace."
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Examinations" value={data.exams.length} accent="purple" />
              <StatCard label="Upcoming" value={upcoming.length} accent="gold" />
              <StatCard label="Classes" value={data.classes.length} accent="green" />
              <StatCard label="Students" value={data.students.length} accent="blue" />
            </div>
            <SectionPanel title="Examination schedule">
              <DataTable columns={columns} rows={data.exams} rowKey={(row) => row.id} emptyMessage="No examinations scheduled for your classes." />
            </SectionPanel>
            <SectionPanel title="Marks entry" description="Entering and finalizing marks stays with the academic administration to protect finalized results.">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <ClipboardCheck size={16} />
                Open the academic grades workspace to enter marks for your classes.
                <Link href="/grades" className="font-semibold text-emerald-600 hover:underline dark:text-emerald-300">
                  Open grades
                </Link>
              </div>
            </SectionPanel>
          </div>
        );
      }}
    </TeacherGate>
  );
}

export function TeacherMaterialsScreen() {
  const { refresh } = usePortalData('teacher');
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [lessonDate, setLessonDate] = useState(todayIso());
  const [duration, setDuration] = useState('45');
  const [objectives, setObjectives] = useState('');
  const [materialsText, setMaterialsText] = useState('');
  const [assessment, setAssessment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = (firstClassId: string) => {
    setClassId(firstClassId);
    setSubjectId('');
    setTitle('');
    setLessonDate(todayIso());
    setDuration('45');
    setObjectives('');
    setMaterialsText('');
    setAssessment('');
    setOpen(true);
  };

  const submit = async () => {
    if (!classId || !title.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/portal/teacher/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          subjectId: subjectId || null,
          title,
          lessonDate,
          durationMinutes: duration,
          objectives,
          materials: materialsText,
          assessment,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Material could not be saved');
      toast.success('Learning material saved', {
        description: 'It is saved as a draft lesson plan.',
      });
      setOpen(false);
      refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Material could not be saved');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TeacherGate>
      {(data) => {
        const materialList: PortalMaterial[] = data.materials;
        const published = materialList.filter(
          (row) => row.status === 'approved' || row.status === 'completed'
        ).length;
        const drafts = materialList.filter((row) => row.status === 'draft').length;
        const coveredClasses = new Set(materialList.map((row) => row.className).filter(Boolean)).size;
        const subjectOptions = data.subjects
          .filter((subject) => subject.classId === classId)
          .map((subject) => ({ value: subject.id, label: `${subject.name} (${subject.code})` }));

        const columns: DataColumn<PortalMaterial>[] = [
          {
            key: 'title',
            header: 'Material',
            render: (row) => (
              <div className="min-w-[200px]">
                <p className="font-semibold">{row.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {row.objectives || row.materials || 'Lesson material'}
                </p>
              </div>
            ),
          },
          { key: 'class', header: 'Class', render: (row) => row.className || '—' },
          { key: 'subject', header: 'Subject', render: (row) => row.subjectName || '—' },
          { key: 'date', header: 'Lesson date', render: (row) => formatDate(row.lessonDate) },
          {
            key: 'duration',
            header: 'Duration',
            render: (row) => (row.durationMinutes ? `${row.durationMinutes} min` : '—'),
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusChip
                label={row.status || 'draft'}
                tone={statusToneFromValue(row.status || 'draft')}
              />
            ),
          },
        ];

        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Learning Materials"
              description="Lesson plans and classroom materials for the classes you teach."
            />
            <div className="flex items-center justify-between gap-3">
              <div className="grid flex-1 grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Materials" value={materialList.length} accent="blue" />
                <StatCard label="Approved" value={published} accent="green" />
                <StatCard label="Drafts" value={drafts} accent="gold" />
                <StatCard label="Classes covered" value={coveredClasses} accent="purple" />
              </div>
              <PortButton
                className="h-10 shrink-0 px-4 text-sm"
                onClick={() => resetForm(data.classes[0]?.id ?? '')}
              >
                <Plus size={15} /> New material
              </PortButton>
            </div>

            <SectionPanel title="Lesson materials" description="Draft materials are visible to you until the academic office approves them.">
              <DataTable
                columns={columns}
                rows={materialList}
                rowKey={(row) => row.id}
                emptyMessage="No learning materials have been added yet."
              />
            </SectionPanel>

            <FormDialog
              open={open}
              title="New learning material"
              onClose={() => setOpen(false)}
              footer={
                <FormDialogFooter
                  onCancel={() => setOpen(false)}
                  submitLabel="Save material"
                  submitting={submitting}
                  formId="teacher-material-form"
                  disabled={!classId || !title.trim()}
                />
              }
            >
              <form
                id="teacher-material-form"
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Dropdown
                    label="Class"
                    value={classId}
                    onChange={(value) => {
                      setClassId(value);
                      setSubjectId('');
                    }}
                    options={data.classes.map((cls) => ({ value: cls.id, label: cls.name }))}
                    placeholder="Select a class"
                  />
                  <Dropdown
                    label="Subject"
                    value={subjectId}
                    onChange={setSubjectId}
                    options={subjectOptions}
                    placeholder={subjectOptions.length ? 'Select a subject' : 'No subjects'}
                  />
                  <InputField
                    label="Title"
                    name="title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. Fractions — week 3"
                    required
                  />
                  <InputField
                    label="Lesson date"
                    type="date"
                    value={lessonDate}
                    onChange={(event) => setLessonDate(event.target.value)}
                  />
                  <InputField
                    label="Duration (minutes)"
                    type="number"
                    min={5}
                    max={480}
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                  />
                </div>
                <TextAreaField
                  label="Objectives"
                  name="objectives"
                  rows={2}
                  value={objectives}
                  onChange={(event) => setObjectives(event.target.value)}
                  placeholder="What should students be able to do after this lesson?"
                />
                <TextAreaField
                  label="Materials"
                  name="materials"
                  rows={2}
                  value={materialsText}
                  onChange={(event) => setMaterialsText(event.target.value)}
                  placeholder="Textbook pages, worksheets, links…"
                />
                <TextAreaField
                  label="Assessment"
                  name="assessment"
                  rows={2}
                  value={assessment}
                  onChange={(event) => setAssessment(event.target.value)}
                  placeholder="How will you check understanding?"
                />
              </form>
            </FormDialog>
          </div>
        );
      }}
    </TeacherGate>
  );
}

export function TeacherReportsScreen() {
  return (
    <TeacherGate>
      {(data) => {
        const classReports = data.classes.map((cls) => {
          const classStudents = data.students.filter((student) => student.classId === cls.id);
          const attendance =
            classStudents.length
              ? Math.round(
                  classStudents.reduce((sum, student) => sum + student.attendancePercentage, 0) /
                    classStudents.length
                )
              : 0;
          const average =
            classStudents.length
              ? Number(
                  (
                    classStudents.reduce((sum, student) => sum + student.averageGrade, 0) /
                    classStudents.length
                  ).toFixed(1)
                )
              : 0;
          return {
            id: cls.id,
            name: cls.name,
            students: classStudents.length,
            attendance,
            average,
            assignments: data.assignments.filter((item) => item.className === cls.name).length,
            exams: data.exams.filter((item) => item.className === cls.name).length,
          };
        });

        const averageAttendance = classReports.length
          ? Math.round(
              classReports.reduce((sum, row) => sum + row.attendance, 0) / classReports.length
            )
          : 0;
        const averageGrade = classReports.length
          ? Number(
              (
                classReports.reduce((sum, row) => sum + row.average, 0) / classReports.length
              ).toFixed(1)
            )
          : 0;
        const gradedSubmissions = data.submissions.filter(
          (submission) => submission.marksObtained != null
        ).length;

        const downloadCsv = () => {
          const lines = [
            ['Class', 'Students', 'Attendance %', 'Average grade', 'Assignments', 'Exams'].join(','),
            ...classReports.map((row) =>
              [row.name, row.students, row.attendance, row.average, row.assignments, row.exams].join(',')
            ),
          ];
          const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'teacher-class-report.csv';
          link.click();
          URL.revokeObjectURL(url);
        };

        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Teaching Reports"
              description="Attendance, performance, and workload across your assigned classes."
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Average attendance" value={`${averageAttendance}%`} accent="green" />
              <StatCard label="Average grade" value={averageGrade || '—'} accent="blue" />
              <StatCard label="Submissions" value={data.submissions.length} accent="purple" />
              <StatCard label="Graded" value={gradedSubmissions} accent="gold" />
            </div>

            <SectionPanel
              title="Class performance"
              description="Averages are calculated from the student records in each class."
              headerRight={
                <PortButton variant="ghost" className="h-8 px-3 text-xs" onClick={downloadCsv}>
                  <Download size={14} /> Export CSV
                </PortButton>
              }
            >
              {classReports.length ? (
                <div className="space-y-3">
                  {classReports.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-xl border border-border bg-background p-3.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{row.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {row.students} students · {row.assignments} assignments · {row.exams} exams
                          </p>
                        </div>
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                          <BarChart3 size={14} />
                          Avg grade {row.average || '—'}
                        </span>
                      </div>
                      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                        <div>
                          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Attendance</span>
                            <span>{row.attendance}%</span>
                          </div>
                          <ProgressBar value={row.attendance} />
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Average grade</span>
                            <span>{row.average || '—'}</span>
                          </div>
                          <ProgressBar value={row.average} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No classes are assigned to you yet." />
              )}
            </SectionPanel>

            <SectionPanel title="Assignment review" description="Submissions waiting for your feedback.">
              <DataTable
                columns={[
                  {
                    key: 'title',
                    header: 'Assignment',
                    render: (row) => (
                      <div className="min-w-[180px]">
                        <p className="font-semibold">{row.title}</p>
                        <p className="text-[11px] text-muted-foreground">{row.className || '—'}</p>
                      </div>
                    ),
                  },
                  { key: 'submitted', header: 'Submissions', render: (row) => row.submissionCount },
                  { key: 'pending', header: 'Pending review', render: (row) => row.pendingReview },
                  {
                    key: 'due',
                    header: 'Due',
                    render: (row) => formatDate(row.dueDate),
                  },
                ]}
                rows={data.assignments}
                rowKey={(row) => row.id}
                emptyMessage="No assignments have been created yet."
              />
            </SectionPanel>
          </div>
        );
      }}
    </TeacherGate>
  );
}
