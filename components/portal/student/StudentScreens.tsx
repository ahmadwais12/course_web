'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Award,
  BookOpen,
  ClipboardList,
  FileText,
  GraduationCap,
  Mail,
  MessageSquare,
  Receipt,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { StatusChip, statusToneFromValue } from '@/components/ports';
import StatCard from '@/components/ports/StatCard';
import DataTable, { type DataColumn } from '@/components/ports/DataTable';
import SectionPanel from '@/components/ports/SectionPanel';
import PageHeader from '@/components/ports/PageHeader';
import EmptyState from '@/components/ports/EmptyState';
import PortButton from '@/components/ports/PortButton';
import Dropdown from '@/components/ports/Dropdown';
import FormDialog, { FormDialogFooter } from '@/components/ports/FormDialog';
import InputField, { TextAreaField } from '@/components/ports/InputField';
import { toast } from '@/components/ui/Toast';
import { usePortalData } from '@/components/portal/PortalDataContext';
import type {
  PortalAssignment,
  PortalCertificate,
  PortalDocument,
  PortalEnrollment,
  PortalGrade,
  PortalInvoice,
  PortalPayment,
  PortalStudentData,
} from '@/lib/portal-types';
import {
  DAY_NAMES,
  DAY_SHORT,
  InfoRow,
  PortalError,
  PortalLoading,
  ProgressBar,
  formatDate,
  formatMoney,
  formatMonth,
  formatShortDate,
  formatTime,
  groupByDay,
  initials,
} from '@/components/portal/PortalUi';

const CURRENCY = 'AFN';

export function StudentGate({ children }: { children: (data: PortalStudentData) => React.ReactNode }) {
  const { data, loading, error, refresh } = usePortalData('student');

  if (loading) return <PortalLoading />;
  if (error) return <PortalError message={error} onRetry={refresh} />;
  if (!data) return <PortalError message="No portal response was returned." onRetry={refresh} />;
  if (!data.student) {
    return (
      <div className="p-1">
        <PageHeader
          title="Student Portal"
          description="Your student profile is not linked yet."
        />
        <EmptyState message="No student record is linked to this account. Contact the academic office to complete your enrollment." />
      </div>
    );
  }
  return <>{children(data)}</>;
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/50"
      />
    );
  }
  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold text-white ring-2 ring-white/40">
      {initials(name)}
    </span>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function todayDayNumber() {
  return ((new Date().getDay() + 6) % 7) + 1;
}

export function StudentDashboardScreen() {
  return (
    <StudentGate>
      {(data) => {
        const student = data.student!;
        const today = todayIso();
        const upcomingExams = data.exams
          .filter((exam) => exam.examDate && exam.examDate >= today && exam.status !== 'cancelled')
          .sort((a, b) => String(a.examDate).localeCompare(String(b.examDate)))
          .slice(0, 5);
        const pendingAssignments = data.assignments
          .filter((item) => !item.submittedAt)
          .sort((a, b) => String(a.dueDate ?? '').localeCompare(String(b.dueDate ?? '')))
          .slice(0, 5);
        const todaySlots = data.timetable.filter((slot) => Number(slot.dayOfWeek) === todayDayNumber());
        const latestResult = data.results[0] ?? null;
        const latestGrade = latestResult?.grade || (student.averageGrade ? student.averageGrade.toFixed(1) : '—');

        return (
          <div className="space-y-4 p-1">
            <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-5 text-white shadow-card sm:p-6">
              <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-16 right-16 h-40 w-40 rounded-full bg-indigo-300/20 blur-3xl" />
              <div className="relative flex flex-wrap items-center gap-4">
                <Avatar name={student.fullName} url={student.photoUrl} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                    Welcome back
                  </p>
                  <h1 className="truncate text-2xl font-bold leading-tight sm:text-3xl">
                    {student.fullName}
                  </h1>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/80">
                    <span className="inline-flex items-center gap-1">
                      <GraduationCap size={13} /> {student.studentCode}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BookOpen size={13} /> {student.class.name || 'No class'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck size={13} /> {student.status || 'active'}
                    </span>
                  </p>
                </div>
                <Link
                  href="/student/profile"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/25"
                >
                  My profile <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['Class', student.class.name || '—'],
                  ['Program', student.class.programName || '—'],
                  ['Enrolled', formatDate(student.enrollmentDate)],
                  ['Average grade', student.averageGrade ? student.averageGrade.toFixed(1) : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/65">{label}</p>
                    <p className="truncate text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </article>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
              <StatCard label="Courses" value={data.subjects.length} hint="Active subjects" accent="blue" />
              <StatCard
                label="Attendance"
                value={`${data.attendance.summary.percentage}%`}
                hint={`${data.attendance.summary.present + data.attendance.summary.late} of ${data.attendance.summary.total} days`}
                accent="green"
              />
              <StatCard label="Upcoming exams" value={upcomingExams.length} hint="Scheduled" accent="purple" />
              <StatCard label="Assignments" value={pendingAssignments.length} hint="Not submitted" accent="gold" />
              <StatCard
                label="Outstanding"
                value={formatMoney(student.outstandingBalance, CURRENCY)}
                hint="Fee balance"
                accent="blue"
              />
              <StatCard label="Latest grade" value={latestGrade} hint={latestResult?.subject || 'No result yet'} accent="green" />
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <SectionPanel
                title="Today's timetable"
                description={DAY_NAMES[todayDayNumber() - 1]}
                headerRight={
                  <Link href="/student/timetable" className="text-xs font-semibold text-sky-600 hover:underline dark:text-sky-300">
                    Full week
                  </Link>
                }
              >
                {todaySlots.length ? (
                  <ul className="space-y-2">
                    {todaySlots.map((slot) => (
                      <li
                        key={slot.id}
                        className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-200">
                          <BookOpen size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{slot.subjectName || 'Subject'}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {slot.teacherName || 'Teacher'}
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
                  <EmptyState message="No classes scheduled for today." />
                )}
              </SectionPanel>

              <SectionPanel
                title="Attendance overview"
                description="Recent monthly attendance"
                headerRight={
                  <Link href="/student/attendance" className="text-xs font-semibold text-sky-600 hover:underline dark:text-sky-300">
                    Details
                  </Link>
                }
              >
                <AttendanceBars data={data} />
              </SectionPanel>

              <SectionPanel
                title="Fee summary"
                description={`Billed ${formatMoney(data.finance.totals.billed, CURRENCY)}`}
                headerRight={
                  <Link href="/student/finance" className="text-xs font-semibold text-sky-600 hover:underline dark:text-sky-300">
                    Invoices
                  </Link>
                }
              >
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Paid</span>
                    <span className="text-sm font-semibold">{formatMoney(data.finance.totals.paid, CURRENCY)}</span>
                  </div>
                  <ProgressBar
                    value={
                      data.finance.totals.billed
                        ? (data.finance.totals.paid / data.finance.totals.billed) * 100
                        : 0
                    }
                    tone="bg-emerald-500"
                  />
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="rounded-xl bg-muted/60 p-2.5">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">Outstanding</p>
                      <p className="text-sm font-bold text-foreground">
                        {formatMoney(data.finance.totals.outstanding, CURRENCY)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/60 p-2.5">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">Overdue</p>
                      <p className="text-sm font-bold text-foreground">
                        {formatMoney(data.finance.totals.overdue, CURRENCY)}
                      </p>
                    </div>
                  </div>
                </div>
              </SectionPanel>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <SectionPanel
                title="Upcoming examinations"
                headerRight={
                  <Link href="/student/exams" className="text-xs font-semibold text-sky-600 hover:underline dark:text-sky-300">
                    All exams
                  </Link>
                }
              >
                {upcomingExams.length ? (
                  <ul className="divide-y divide-border">
                    {upcomingExams.map((exam) => (
                      <li key={exam.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                        <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-200">
                          <span className="text-[10px] font-bold uppercase">{formatShortDate(exam.examDate)}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{exam.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {exam.subject || exam.examType || 'Exam'}
                            {exam.startTime ? ` · ${formatTime(exam.startTime)}` : ''}
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

              <SectionPanel
                title="Assignment deadlines"
                headerRight={
                  <Link href="/student/assignments" className="text-xs font-semibold text-sky-600 hover:underline dark:text-sky-300">
                    All assignments
                  </Link>
                }
              >
                {pendingAssignments.length ? (
                  <ul className="divide-y divide-border">
                    {pendingAssignments.map((item) => (
                      <li key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200">
                          <ClipboardList size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{item.title}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {item.subjectName || 'Subject'} · due {formatDate(item.dueDate)}
                          </p>
                        </div>
                        <StatusChip label="pending" tone="gold" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState message="No pending assignments." />
                )}
              </SectionPanel>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <SectionPanel title="Latest results" headerRight={<Link href="/student/exams" className="text-xs font-semibold text-sky-600 hover:underline dark:text-sky-300">All results</Link>}>
                {data.results.length ? (
                  <ul className="divide-y divide-border">
                    {data.results.slice(0, 5).map((result) => (
                      <li key={result.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                        <Award size={16} className="shrink-0 text-sky-600 dark:text-sky-300" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{result.examName || result.subject || 'Exam'}</p>
                          <p className="text-[11px] text-muted-foreground">{result.subject || '—'}</p>
                        </div>
                        <span className="text-sm font-bold tabular-nums">
                          {result.score ?? '—'}
                          <span className="text-xs font-medium text-muted-foreground">/{result.maxScore ?? '—'}</span>
                        </span>
                        {result.grade && <StatusChip label={result.grade} tone="green" />}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState message="Results will appear after grading." />
                )}
              </SectionPanel>

              <SectionPanel title="Quick links" description="Communication and records">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { href: '/messaging', label: 'Messages', icon: MessageSquare },
                    { href: '/notifications', label: 'Notifications', icon: Mail },
                    { href: '/student/documents', label: 'Documents', icon: FileText },
                    { href: '/student/finance', label: 'Receipts', icon: Receipt },
                  ].map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background px-2 py-4 text-center text-xs font-semibold text-foreground transition hover:border-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                    >
                      <link.icon size={18} className="text-sky-600 dark:text-sky-300" />
                      {link.label}
                    </Link>
                  ))}
                </div>
              </SectionPanel>
            </div>
          </div>
        );
      }}
    </StudentGate>
  );
}

function AttendanceBars({ data }: { data: PortalStudentData }) {
  const months = data.attendance.monthly;
  if (!months.length) return <EmptyState message="No attendance recorded yet." />;
  const max = Math.max(1, ...months.map((month) => month.total));
  return (
    <div className="space-y-2">
      <div className="flex h-28 items-end justify-between gap-2">
        {[...months].reverse().map((month) => {
          const ratio = month.total ? month.present / month.total : 0;
          return (
            <div key={month.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div className="flex h-full w-full max-w-10 items-end overflow-hidden rounded-t-lg bg-muted">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-sky-600 to-sky-400"
                  style={{ height: `${Math.max(6, (month.total / max) * 100 * ratio)}%` }}
                  title={`${month.present} present of ${month.total}`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{formatMonth(month.month).split(' ')[0]}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{data.attendance.summary.present} present</span>
        <span>{data.attendance.summary.absent} absent</span>
        <span>{data.attendance.summary.late} late</span>
      </div>
    </div>
  );
}

export function StudentProfileScreen() {
  return (
    <StudentGate>
      {(data) => {
        const student = data.student!;
        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="My Profile"
              description="Your personal, guardian, and academic information on record."
            />
            <div className="grid gap-4 lg:grid-cols-3">
              <SectionPanel title="Student identity">
                <div className="flex items-center gap-3">
                  {student.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={student.photoUrl} alt={student.fullName} className="h-16 w-16 rounded-2xl object-cover" />
                  ) : (
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-xl font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-200">
                      {initials(student.fullName)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold">{student.fullName}</p>
                    <p className="text-xs text-muted-foreground">{student.studentCode}</p>
                    <div className="mt-1">
                      <StatusChip label={student.status || 'active'} tone={statusToneFromValue(student.status || 'active')} />
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <InfoRow label="Email" value={student.email} />
                  <InfoRow label="Phone" value={student.phone} />
                  <InfoRow label="Date of birth" value={formatDate(student.dateOfBirth)} />
                  <InfoRow label="Gender" value={student.gender} />
                  <InfoRow label="Address" value={student.address} />
                  <InfoRow label="City" value={student.city} />
                </div>
              </SectionPanel>

              <SectionPanel title="Guardian">
                <InfoRow label="Guardian name" value={student.guardianName} />
                <InfoRow label="Relationship" value={student.guardianRelationship} />
                <InfoRow label="Guardian phone" value={student.guardianPhone} />
                <InfoRow label="Guardian email" value={student.guardianEmail} />
              </SectionPanel>

              <SectionPanel title="Academic">
                <InfoRow label="Class" value={student.class.name} />
                <InfoRow label="Grade" value={student.class.grade} />
                <InfoRow label="Program" value={student.class.programName} />
                <InfoRow label="Level" value={student.studentLevel} />
                <InfoRow label="Batch" value={student.batchNumber} />
                <InfoRow label="Enrollment date" value={formatDate(student.enrollmentDate)} />
                <InfoRow label="Expected completion" value={formatDate(student.expectedCompletionDate)} />
                <InfoRow label="Certificate issued" value={student.certificateIssued ? 'Yes' : 'No'} />
              </SectionPanel>
            </div>
            <SectionPanel title="Financial snapshot">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">Total fees</p>
                  <p className="text-lg font-bold">{formatMoney(student.totalFees, CURRENCY)}</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">Paid</p>
                  <p className="text-lg font-bold">{formatMoney(student.paidAmount, CURRENCY)}</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">Outstanding</p>
                  <p className="text-lg font-bold">{formatMoney(student.outstandingBalance, CURRENCY)}</p>
                </div>
              </div>
            </SectionPanel>
          </div>
        );
      }}
    </StudentGate>
  );
}

export function StudentAcademicsScreen() {
  return (
    <StudentGate>
      {(data) => {
        const student = data.student!;
        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Courses & Subjects"
              description={`Enrolled in ${student.class.name || 'no class'}${student.class.programName ? ` · ${student.class.programName}` : ''}.`}
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Subjects" value={data.subjects.length} accent="blue" />
              <StatCard label="Class" value={student.class.name || '—'} accent="green" />
              <StatCard label="Program" value={student.class.programName || '—'} accent="purple" />
              <StatCard label="Level" value={student.studentLevel || '—'} accent="gold" />
            </div>
            <SectionPanel title="My subjects" description="Teacher assignment for each subject in your class.">
              {data.subjects.length ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {data.subjects.map((subject) => (
                    <article key={subject.id} className="rounded-xl border border-border bg-background p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{subject.name}</p>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {subject.code}
                          </p>
                        </div>
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-200">
                          <BookOpen size={16} />
                        </span>
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <UserRound size={13} /> {subject.teacherName || 'Teacher not assigned'}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState message="No subjects are linked to your class yet." />
              )}
            </SectionPanel>
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionPanel title="Enrollment">
                <InfoRow label="Enrollment date" value={formatDate(student.enrollmentDate)} />
                <InfoRow label="Expected completion" value={formatDate(student.expectedCompletionDate)} />
                <InfoRow label="Status" value={<StatusChip label={student.status || 'active'} tone={statusToneFromValue(student.status || 'active')} />} />
                <InfoRow label="Batch" value={student.batchNumber} />
              </SectionPanel>
              <SectionPanel title="Academic performance">
                <InfoRow label="Attendance" value={`${data.attendance.summary.percentage}%`} />
                <InfoRow label="Average grade" value={student.averageGrade ? student.averageGrade.toFixed(2) : '—'} />
                <InfoRow label="Recorded results" value={data.results.length} />
                <InfoRow label="Assignments" value={data.assignments.length} />
              </SectionPanel>
            </div>
          </div>
        );
      }}
    </StudentGate>
  );
}

export function StudentTimetableScreen() {
  return (
    <StudentGate>
      {(data) => {
        const days = groupByDay(data.timetable);
        return (
          <div className="space-y-4 p-1">
            <PageHeader title="My Timetable" description="Weekly class schedule with subjects, teachers, and rooms." />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Weekly slots" value={data.timetable.length} accent="blue" />
              <StatCard label="Subjects" value={data.subjects.length} accent="green" />
              <StatCard label="Class" value={data.student?.class.name || '—'} accent="purple" />
              <StatCard label="Today" value={DAY_SHORT[todayDayNumber() - 1]} accent="gold" />
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {days.map((day) => (
                <SectionPanel
                  key={day.day}
                  title={day.name}
                  description={day.slots.length ? `${day.slots.length} class${day.slots.length === 1 ? '' : 'es'}` : 'No classes'}
                  className={day.day === todayDayNumber() ? 'ring-2 ring-sky-400/60' : undefined}
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
                            {slot.teacherName || 'Teacher'}
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
    </StudentGate>
  );
}

export function StudentAttendanceScreen() {
  return (
    <StudentGate>
      {(data) => {
        const columns: DataColumn<PortalStudentData['attendance']['recent'][number]>[] = [
          { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusChip
                label={row.status || '—'}
                tone={statusToneFromValue(row.status || '')}
              />
            ),
          },
          { key: 'in', header: 'Check in', render: (row) => formatTime(row.checkInTime) },
          { key: 'out', header: 'Check out', render: (row) => formatTime(row.checkOutTime) },
          { key: 'late', header: 'Late (min)', render: (row) => (row.lateMinutes ? row.lateMinutes : '—') },
          { key: 'remarks', header: 'Remarks', render: (row) => row.remarks || '—' },
        ];
        return (
          <div className="space-y-4 p-1">
            <PageHeader title="My Attendance" description="Daily attendance history recorded by your teachers." />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatCard label="Attendance" value={`${data.attendance.summary.percentage}%`} accent="green" />
              <StatCard label="Present" value={data.attendance.summary.present} accent="blue" />
              <StatCard label="Absent" value={data.attendance.summary.absent} accent="purple" />
              <StatCard label="Late" value={data.attendance.summary.late} accent="gold" />
              <StatCard label="Excused" value={data.attendance.summary.excused} accent="green" />
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              <SectionPanel title="Monthly trend" className="xl:col-span-1">
                <AttendanceBars data={data} />
              </SectionPanel>
              <SectionPanel title="Attendance history" className="xl:col-span-2">
                <DataTable
                  columns={columns}
                  rows={data.attendance.recent}
                  rowKey={(row) => row.id}
                  emptyMessage="No attendance records yet."
                />
              </SectionPanel>
            </div>
          </div>
        );
      }}
    </StudentGate>
  );
}

export function StudentAssignmentsScreen() {
  const [target, setTarget] = useState<PortalAssignment | null>(null);
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { refresh } = usePortalData('student');

  const openSubmit = (assignment: PortalAssignment) => {
    setTarget(assignment);
    setNote('');
    setFile(null);
  };

  const submit = async () => {
    if (!target) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set('homeworkId', target.id);
      form.set('submission_text', note);
      if (file) form.set('file', file);
      const response = await fetch('/api/portal/student/assignments', {
        method: 'POST',
        body: form,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Submission failed');
      toast.success('Assignment submitted', { description: 'Your teacher can now review it.' });
      setTarget(null);
      refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudentGate>
      {(data) => {
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
          { key: 'due', header: 'Due date', render: (row) => formatDate(row.dueDate) },
          { key: 'max', header: 'Max marks', render: (row) => row.maxMarks ?? '—' },
          {
            key: 'status',
            header: 'Submission',
            render: (row) => (
              <StatusChip
                label={row.submissionStatus || 'pending'}
                tone={statusToneFromValue(row.submissionStatus || 'pending')}
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
            header: 'Feedback',
            render: (row) => (
              <span className="block max-w-[220px] truncate" title={row.feedback || ''}>
                {row.feedback || '—'}
              </span>
            ),
          },
          {
            key: 'file',
            header: 'Attachment',
            render: (row) =>
              row.attachmentUrl ? (
                <a
                  href={row.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-sky-600 hover:underline dark:text-sky-300"
                >
                  Open
                </a>
              ) : (
                '—'
              ),
          },
          {
            key: 'actions',
            header: '',
            render: (row) =>
              row.submissionStatus !== 'graded' ? (
                <PortButton className="h-8 px-3 text-xs" onClick={() => openSubmit(row)}>
                  {row.submittedAt ? 'Resubmit' : 'Submit'}
                </PortButton>
              ) : (
                <span className="text-[11px] text-muted-foreground">Graded</span>
              ),
          },
        ];
        const pending = data.assignments.filter((item) => !item.submittedAt).length;
        const graded = data.assignments.filter((item) => item.marksObtained != null).length;
        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Assignments"
              description="Homework set for your class, with deadlines, marks, and teacher feedback."
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Total" value={data.assignments.length} accent="blue" />
              <StatCard label="Pending" value={pending} accent="gold" />
              <StatCard label="Graded" value={graded} accent="green" />
              <StatCard label="Class" value={data.student?.class.name || '—'} accent="purple" />
            </div>
            <SectionPanel title="All assignments" description="Submission uploads are managed by your teacher through the academic office.">
              <DataTable columns={columns} rows={data.assignments} rowKey={(row) => row.id} emptyMessage="No assignments have been published yet." />
            </SectionPanel>

            <FormDialog
              open={Boolean(target)}
              title={target ? `Submit: ${target.title}` : 'Submit assignment'}
              onClose={() => setTarget(null)}
              footer={
                <FormDialogFooter
                  onCancel={() => setTarget(null)}
                  submitLabel="Submit assignment"
                  submitting={submitting}
                  formId="student-assignment-form"
                  disabled={!note.trim() && !file}
                />
              }
            >
              <form
                id="student-assignment-form"
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
                <div className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  Due {formatDate(target?.dueDate)} · Max marks {target?.maxMarks ?? '—'} ·{' '}
                  {target?.subjectName || 'Subject'}
                </div>
                <TextAreaField
                  label="Submission note"
                  name="submission_text"
                  rows={4}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add a short note for your teacher…"
                />
                <InputField
                  label="Attachment"
                  type="file"
                  name="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,image/*"
                  hint="PDF, Office, image, text, or ZIP — up to 10 MB."
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
                {target?.submittedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last submitted {formatDate(target.submittedAt)}. Submitting again replaces your note and file.
                  </p>
                )}
              </form>
            </FormDialog>
          </div>
        );
      }}
    </StudentGate>
  );
}

export function StudentExamsScreen() {
  return (
    <StudentGate>
      {(data) => {
        const examColumns: DataColumn<PortalStudentData['exams'][number]>[] = [
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
          { key: 'date', header: 'Date', render: (row) => formatDate(row.examDate) },
          {
            key: 'time',
            header: 'Time',
            render: (row) =>
              row.startTime ? `${formatTime(row.startTime)}–${formatTime(row.endTime)}` : '—',
          },
          { key: 'marks', header: 'Total / Passing', render: (row) => `${row.totalMarks ?? '—'} / ${row.passingMarks ?? '—'}` },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusChip label={row.status || 'scheduled'} tone={statusToneFromValue(row.status || 'scheduled')} />
            ),
          },
        ];
        const resultColumns: DataColumn<PortalGrade>[] = [
          {
            key: 'exam',
            header: 'Examination',
            render: (row) => (
              <div className="min-w-[160px]">
                <p className="font-semibold">{row.examName || 'Exam'}</p>
                <p className="text-[11px] text-muted-foreground">{row.subject || '—'}</p>
              </div>
            ),
          },
          {
            key: 'score',
            header: 'Score',
            render: (row) => (
              <span className="tabular-nums">
                {row.score ?? '—'}
                <span className="text-xs text-muted-foreground">/{row.maxScore ?? '—'}</span>
              </span>
            ),
          },
          { key: 'percent', header: '%', render: (row) => (row.percentage == null ? '—' : `${row.percentage}%`) },
          { key: 'grade', header: 'Grade', render: (row) => (row.grade ? <StatusChip label={row.grade} tone="green" /> : '—') },
          { key: 'remarks', header: 'Remarks', render: (row) => row.remarks || '—' },
        ];
        return (
          <div className="space-y-4 p-1">
            <PageHeader title="Exams & Results" description="Examination schedule and graded results for your class." />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Exams" value={data.exams.length} accent="purple" />
              <StatCard label="Results" value={data.results.length} accent="green" />
              <StatCard label="Average" value={data.student?.averageGrade ? data.student.averageGrade.toFixed(1) : '—'} accent="blue" />
              <StatCard label="Latest grade" value={data.results[0]?.grade || '—'} accent="gold" />
            </div>
            <SectionPanel title="Examination schedule">
              <DataTable columns={examColumns} rows={data.exams} rowKey={(row) => row.id} emptyMessage="No examinations scheduled." />
            </SectionPanel>
            <SectionPanel title="Results & grades">
              <DataTable columns={resultColumns} rows={data.results} rowKey={(row) => row.id} emptyMessage="No results have been published yet." />
            </SectionPanel>
          </div>
        );
      }}
    </StudentGate>
  );
}

export function StudentFinanceScreen() {
  return (
    <StudentGate>
      {(data) => {
        const invoiceColumns: DataColumn<PortalInvoice>[] = [
          { key: 'number', header: 'Invoice', render: (row) => <span className="font-semibold">{row.invoiceNumber}</span> },
          { key: 'issue', header: 'Issued', render: (row) => formatDate(row.issueDate) },
          { key: 'due', header: 'Due', render: (row) => formatDate(row.dueDate) },
          { key: 'total', header: 'Total', align: 'right', render: (row) => formatMoney(row.totalAmount, CURRENCY) },
          { key: 'paid', header: 'Paid', align: 'right', render: (row) => formatMoney(row.paidAmount, CURRENCY) },
          {
            key: 'outstanding',
            header: 'Outstanding',
            align: 'right',
            render: (row) => (
              <span className={row.outstandingAmount > 0 ? 'font-semibold text-amber-700 dark:text-amber-300' : ''}>
                {formatMoney(row.outstandingAmount, CURRENCY)}
              </span>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusChip label={row.status || 'pending'} tone={statusToneFromValue(row.status || 'pending')} />,
          },
        ];
        const paymentColumns: DataColumn<PortalPayment>[] = [
          { key: 'number', header: 'Payment', render: (row) => <span className="font-semibold">{row.paymentNumber}</span> },
          { key: 'date', header: 'Date', render: (row) => formatDate(row.paymentDate) },
          { key: 'method', header: 'Method', render: (row) => row.paymentMethod?.replaceAll('_', ' ') || '—' },
          { key: 'type', header: 'Type', render: (row) => row.paymentType || '—' },
          { key: 'amount', header: 'Amount', align: 'right', render: (row) => formatMoney(row.amount, CURRENCY) },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusChip label={row.status || 'completed'} tone={statusToneFromValue(row.status || 'completed')} />,
          },
          {
            key: 'receipt',
            header: 'Receipt',
            render: (row) =>
              row.receiptUrl ? (
                <a href={row.receiptUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-sky-600 hover:underline dark:text-sky-300">
                  Download
                </a>
              ) : (
                '—'
              ),
          },
        ];
        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Fees & Invoices"
              description="Your fee balance, invoices, and payment history. Finance records are read-only in the portal."
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Billed" value={formatMoney(data.finance.totals.billed, CURRENCY)} accent="blue" />
              <StatCard label="Paid" value={formatMoney(data.finance.totals.paid, CURRENCY)} accent="green" />
              <StatCard label="Outstanding" value={formatMoney(data.finance.totals.outstanding, CURRENCY)} accent="gold" />
              <StatCard label="Overdue" value={formatMoney(data.finance.totals.overdue, CURRENCY)} accent="purple" />
            </div>
            <SectionPanel title="Invoices">
              <DataTable columns={invoiceColumns} rows={data.finance.invoices} rowKey={(row) => row.id} emptyMessage="No invoices have been issued." />
            </SectionPanel>
            <SectionPanel title="Payment history">
              <DataTable columns={paymentColumns} rows={data.finance.payments} rowKey={(row) => row.id} emptyMessage="No payments recorded yet." />
            </SectionPanel>
          </div>
        );
      }}
    </StudentGate>
  );
}

export function StudentDocumentsScreen() {
  return (
    <StudentGate>
      {(data) => {
        const documents: PortalDocument[] = data.documents;
        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="My Documents"
              description="Academic records, certificates, and transcripts shared with you."
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Documents" value={documents.length} accent="blue" />
              <StatCard label="Verified" value={documents.filter((doc) => doc.isVerified).length} accent="green" />
              <StatCard label="Certificate" value={data.student?.certificateIssued ? 'Issued' : 'Not issued'} accent="purple" />
              <StatCard label="Student code" value={data.student?.studentCode || '—'} accent="gold" />
            </div>
            <SectionPanel title="Document library">
              {documents.length ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {documents.map((doc) => (
                    <article key={doc.id} className="flex flex-col rounded-xl border border-border bg-background p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-200">
                          <FileText size={18} />
                        </span>
                        <StatusChip label={doc.isVerified ? 'verified' : 'unverified'} tone={doc.isVerified ? 'green' : 'gold'} />
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold capitalize">{doc.title}</p>
                      <p className="text-[11px] capitalize text-muted-foreground">{doc.documentType?.replaceAll('_', ' ') || 'Document'}</p>
                      <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                        {doc.issueDate && <p>Issued {formatDate(doc.issueDate)}</p>}
                        {doc.expiryDate && <p>Expires {formatDate(doc.expiryDate)}</p>}
                        {doc.issuedBy && <p>By {doc.issuedBy}</p>}
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline dark:text-sky-300"
                      >
                        Open document <ArrowUpRight size={13} />
                      </a>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState message="No documents have been shared with your account yet." />
              )}
            </SectionPanel>
            <SectionPanel title="Need a certificate?" description="Certificate requests are handled by the academic office.">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Mail size={15} />
                Open
                <Link href="/student/certificates" className="font-semibold text-sky-600 hover:underline dark:text-sky-300">
                  Certificates
                </Link>
                to request one, or message the academic office through
                <Link href="/messaging" className="font-semibold text-sky-600 hover:underline dark:text-sky-300">
                  Messages
                </Link>
                .
              </div>
            </SectionPanel>
          </div>
        );
      }}
    </StudentGate>
  );
}

export function StudentEnrollmentScreen() {
  return (
    <StudentGate>
      {(data) => {
        const student = data.student!;
        const enrollments: PortalEnrollment[] = data.enrollments;
        const activeEnrollment = enrollments.find((row) => row.status === 'active') ?? null;

        const columns: DataColumn<PortalEnrollment>[] = [
          {
            key: 'class',
            header: 'Class',
            render: (row) => (
              <div className="min-w-[160px]">
                <p className="font-semibold">{row.className || '—'}</p>
                <p className="text-[11px] text-muted-foreground">{row.grade || student.class.grade || 'Grade'}</p>
              </div>
            ),
          },
          { key: 'year', header: 'Academic year', render: (row) => row.academicYear || '—' },
          { key: 'date', header: 'Enrolled', render: (row) => formatDate(row.enrollmentDate) },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusChip
                label={row.status || '—'}
                tone={statusToneFromValue(row.status || '')}
              />
            ),
          },
          {
            key: 'remarks',
            header: 'Remarks',
            render: (row) => (
              <span className="block max-w-[240px] truncate" title={row.remarks || ''}>
                {row.remarks || '—'}
              </span>
            ),
          },
        ];

        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Enrollment"
              description="Your current placement and complete enrollment history at the institute."
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Current class" value={student.class.name || '—'} accent="blue" />
              <StatCard label="Program" value={student.class.programName || '—'} accent="purple" />
              <StatCard label="Status" value={student.status || '—'} accent="green" />
              <StatCard label="Enrolled" value={formatDate(student.enrollmentDate)} accent="gold" />
            </div>

            {activeEnrollment && (
              <SectionPanel
                title="Current placement"
                description="Confirmed enrollment for the active academic year."
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoRow label="Class" value={activeEnrollment.className || student.class.name || '—'} />
                  <InfoRow label="Academic year" value={activeEnrollment.academicYear || '—'} />
                  <InfoRow label="Grade level" value={activeEnrollment.grade || student.class.grade || '—'} />
                  <InfoRow label="Enrollment date" value={formatDate(activeEnrollment.enrollmentDate)} />
                </div>
              </SectionPanel>
            )}

            <SectionPanel title="Enrollment history" description="Every class placement recorded for your student profile.">
              <DataTable
                columns={columns}
                rows={enrollments}
                rowKey={(row) => row.id}
                emptyMessage="No enrollment records have been added yet."
              />
            </SectionPanel>
          </div>
        );
      }}
    </StudentGate>
  );
}

const CERTIFICATE_TYPES = [
  { value: 'completion', label: 'Course completion' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'participation', label: 'Participation' },
  { value: 'merit', label: 'Merit' },
  { value: 'level', label: 'Level completion' },
];

export function StudentCertificatesScreen() {
  const { refresh } = usePortalData('student');
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('completion');
  const [course, setCourse] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const startRequest = (defaultCourse: string) => {
    setType('completion');
    setCourse(defaultCourse);
    setNotes('');
    setOpen(true);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/portal/student/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificateType: type, courseName: course, notes }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Request could not be submitted');
      toast.success('Certificate requested', {
        description: 'The academic office will review your request.',
      });
      setOpen(false);
      refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Request could not be submitted');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudentGate>
      {(data) => {
        const certificates: PortalCertificate[] = data.certificates;
        const issued = certificates.filter((row) => row.status === 'issued').length;
        const pending = certificates.filter((row) => row.status === 'draft').length;
        const defaultCourse = data.student?.class.programName || data.student?.class.name || '';

        const columns: DataColumn<PortalCertificate>[] = [
          {
            key: 'type',
            header: 'Certificate',
            render: (row) => (
              <div className="min-w-[170px]">
                <p className="font-semibold capitalize">
                  {row.certificateType?.replaceAll('_', ' ') || 'Certificate'}
                </p>
                <p className="text-[11px] text-muted-foreground">{row.courseName || '—'}</p>
              </div>
            ),
          },
          { key: 'level', header: 'Level', render: (row) => row.levelAchieved || '—' },
          { key: 'date', header: 'Issued', render: (row) => formatDate(row.issueDate) },
          { key: 'number', header: 'Number', render: (row) => row.certificateNumber || '—' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => {
              const label = row.status === 'draft' ? 'pending approval' : row.status || '—';
              const tone =
                row.status === 'issued' ? 'green' : row.status === 'revoked' ? 'gray' : 'gold';
              return <StatusChip label={label} tone={tone} />;
            },
          },
          {
            key: 'actions',
            header: '',
            render: (row) =>
              row.certificateUrl && row.status === 'issued' ? (
                <a
                  href={row.certificateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline dark:text-sky-300"
                >
                  Open <ArrowUpRight size={13} />
                </a>
              ) : (
                <span className="text-[11px] text-muted-foreground">—</span>
              ),
          },
        ];

        return (
          <div className="space-y-4 p-1">
            <PageHeader
              title="Certificates"
              description="Issued certificates and requests waiting for the academic office."
            />
            <div className="flex items-center justify-between gap-3">
              <div className="grid flex-1 grid-cols-2 gap-3 lg:grid-cols-3">
                <StatCard label="Issued" value={issued} accent="green" />
                <StatCard label="Pending approval" value={pending} accent="gold" />
                <StatCard label="Total" value={certificates.length} accent="blue" />
              </div>
              <PortButton className="h-10 shrink-0 px-4 text-sm" onClick={() => startRequest(defaultCourse)}>
                Request certificate
              </PortButton>
            </div>

            <SectionPanel title="Certificates" description="Requests appear here until the academic office issues them.">
              <DataTable
                columns={columns}
                rows={certificates}
                rowKey={(row) => row.id}
                emptyMessage="No certificates have been issued yet."
              />
            </SectionPanel>

            <FormDialog
              open={open}
              title="Request a certificate"
              onClose={() => setOpen(false)}
              footer={
                <FormDialogFooter
                  onCancel={() => setOpen(false)}
                  submitLabel="Send request"
                  submitting={submitting}
                  formId="student-certificate-form"
                  disabled={!type}
                />
              }
            >
              <form
                id="student-certificate-form"
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
                <Dropdown
                  label="Certificate type"
                  value={type}
                  onChange={setType}
                  options={CERTIFICATE_TYPES}
                />
                <InputField
                  label="Course or program"
                  name="course"
                  value={course}
                  onChange={(event) => setCourse(event.target.value)}
                  placeholder="Program name"
                />
                <TextAreaField
                  label="Reason (optional)"
                  name="notes"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Tell the office why you need this certificate…"
                />
                <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  Your request is sent to the academic office for review. You will be notified when
                  it is issued.
                </p>
              </form>
            </FormDialog>
          </div>
        );
      }}
    </StudentGate>
  );
}
