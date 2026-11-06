'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ClipboardList,
  GraduationCap,
  Pencil,
  UserRound,
  UserSquare2,
} from 'lucide-react';
import {
  Dropdown,
  ErrorBanner,
  InputField,
  PasswordField,
  PortButton,
  TextAreaField,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    id: 1,
    title: 'Account',
    hint: 'Student login',
    blurb: 'Create the student email and password they will use to sign in.',
    icon: GraduationCap,
  },
  {
    id: 2,
    title: 'Details',
    hint: 'Personal info',
    blurb: 'Identity and contact details for the student record.',
    icon: UserSquare2,
  },
  {
    id: 3,
    title: 'Academic',
    hint: 'Program & fees',
    blurb: 'Program placement, duration, and fee schedule.',
    icon: BookOpen,
  },
  {
    id: 4,
    title: 'Parent',
    hint: 'Guardian account',
    blurb: 'Separate guardian login linked to this student.',
    icon: UserRound,
  },
  {
    id: 5,
    title: 'Overview',
    hint: 'Review & create',
    blurb: 'Confirm every phase, then create both accounts.',
    icon: ClipboardList,
  },
] as const;

const TOTAL_STEPS = STEPS.length;

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

const RELATIONSHIP_OPTIONS = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other', label: 'Other' },
];

function validatePassword(password: string, label: string): string | null {
  if (password.length < 6) return `${label} password must be at least 6 characters`;
  return null;
}

function labelOf(options: { value: string; label: string }[], value: string) {
  return options.find((o) => o.value === value)?.label || value || '—';
}

function maskSecret(value: string) {
  if (!value) return '—';
  return '•'.repeat(Math.min(Math.max(value.length, 6), 14));
}

type Option = { value: string; label: string };

function OverviewBlock({
  phase,
  title,
  onEdit,
  children,
}: {
  phase: string;
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card/80 shadow-card">
      <div className="absolute inset-y-0 start-0 w-1 bg-[#88b6ff] opacity-80 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3 border-b border-border/80 px-4 py-3 ps-5">
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.16em] text-[#88b6ff]">
            Phase {phase}
          </p>
          <h3 className="m-0 mt-0.5 text-base font-semibold text-foreground">{title}</h3>
        </div>
        <PortButton
          type="button"
          variant="ghost"
          className="h-9 shrink-0 gap-1.5 px-2.5"
          onClick={onEdit}
        >
          <Pencil size={14} />
          Edit
        </PortButton>
      </div>
      <dl className="grid gap-0 px-4 py-1 ps-5 sm:grid-cols-2">{children}</dl>
    </article>
  );
}

function OverviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-border/50 py-2.5 last:border-0 sm:odd:pe-4">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-foreground">{value || '—'}</dd>
    </div>
  );
}

export default function CreateStudentParentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [programOptions, setProgramOptions] = useState<Option[]>([]);
  const [classOptions, setClassOptions] = useState<Option[]>([]);
  const [durationOptions, setDurationOptions] = useState<Option[]>([]);
  const [levelOptions, setLevelOptions] = useState<Option[]>([]);
  const [entered, setEntered] = useState(false);

  const [studentFullName, setStudentFullName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentPasswordConfirm, setStudentPasswordConfirm] = useState('');
  const [studentAddress, setStudentAddress] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [tazkiraNumber, setTazkiraNumber] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );

  const [programId, setProgramId] = useState('');
  const [classId, setClassId] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [studentLevel, setStudentLevel] = useState('');
  const [totalFees, setTotalFees] = useState('0');
  const [discountPercentage, setDiscountPercentage] = useState('0');
  const [notes, setNotes] = useState('');

  const [parentFullName, setParentFullName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [parentPasswordConfirm, setParentPasswordConfirm] = useState('');
  const [parentAddress, setParentAddress] = useState('');
  const [relationship, setRelationship] = useState('guardian');

  const current = STEPS[step - 1];
  const CurrentIcon = current.icon;
  const progress = useMemo(() => (step / TOTAL_STEPS) * 100, [step]);
  const feesNum = Number(totalFees) || 0;
  const discountNum = Number(discountPercentage) || 0;
  const netAmount = feesNum - feesNum * (discountNum / 100);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    setEntered(false);
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [step]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [programsRes, classesRes, durationsRes, levelsRes] = await Promise.all([
          fetch('/api/programs'),
          fetch('/api/classes'),
          fetch('/api/durations'),
          fetch('/api/student-levels'),
        ]);
        if (programsRes.ok) {
          const programs = await programsRes.json();
          if (!cancelled && Array.isArray(programs)) {
            setProgramOptions(
              programs
                .filter((p: { status?: string }) => p.status !== 'inactive')
                .map((p: { id: string; name?: string; code?: string }) => ({
                  value: p.id,
                  label: p.name || p.code || p.id,
                }))
            );
          }
        }
        if (classesRes.ok) {
          const classes = await classesRes.json();
          if (!cancelled && Array.isArray(classes)) {
            setClassOptions(
              classes
                .filter((c: { status?: string; active?: boolean }) => c.status !== 'inactive' && c.active !== false)
                .map((c: { id: string; name?: string; grade?: string }) => ({
                  value: c.id,
                  label: c.name || c.grade || c.id,
                }))
            );
          }
        }
        if (durationsRes.ok) {
          const durations = await durationsRes.json();
          if (!cancelled && Array.isArray(durations)) {
            setDurationOptions(
              durations
                .filter(
                  (d: { is_active?: boolean; status?: string; months?: number }) =>
                    d.is_active !== false && d.status !== 'inactive' && d.status !== 'archived'
                )
                .map((d: { months?: number; name?: string }) => ({
                  value: String(d.months ?? ''),
                  label: d.name || `${d.months} Months`,
                }))
                .filter((o: Option) => o.value)
            );
          }
        }
        if (levelsRes.ok) {
          const levels = await levelsRes.json();
          if (!cancelled && Array.isArray(levels)) {
            setLevelOptions(
              levels
                .filter(
                  (l: { is_active?: boolean; status?: string; name?: string }) =>
                    l.is_active !== false && l.status !== 'inactive' && l.status !== 'archived'
                )
                .map((l: { name?: string; slug?: string; id?: string }) => ({
                  value: l.name || l.slug || l.id || '',
                  label: l.name || l.slug || l.id || '',
                }))
                .filter((o: Option) => o.value)
            );
          }
        }
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const validateAccount = () => {
    if (!studentFullName.trim()) return 'Student full name is required';
    if (!studentEmail.trim() || !studentEmail.includes('@')) return 'Valid student email is required';
    if (!studentPhone.trim()) return 'Student phone is required';
    const pwdErr = validatePassword(studentPassword, 'Student');
    if (pwdErr) return pwdErr;
    if (studentPassword !== studentPasswordConfirm) return 'Student passwords do not match';
    return null;
  };

  const validateDetails = () => {
    if (!gender) return 'Gender is required';
    return null;
  };

  const validateAcademic = () => {
    if (!programId) return 'Program is required';
    if (!durationMonths) return 'Duration is required';
    if (feesNum < 0) return 'Total fees cannot be negative';
    if (discountNum < 0 || discountNum > 100) return 'Discount must be between 0 and 100';
    return null;
  };

  const validateParent = () => {
    if (!parentFullName.trim()) return 'Parent / guardian full name is required';
    if (!parentEmail.trim() || !parentEmail.includes('@')) return 'Valid parent email is required';
    if (!parentPhone.trim()) return 'Parent phone is required';
    const pwdErr = validatePassword(parentPassword, 'Parent');
    if (pwdErr) return pwdErr;
    if (parentPassword !== parentPasswordConfirm) return 'Parent passwords do not match';
    if (studentEmail.trim().toLowerCase() === parentEmail.trim().toLowerCase()) {
      return 'Student and parent must use different emails';
    }
    if (!relationship) return 'Relationship is required';
    return null;
  };

  const validateUpTo = (targetStep: number): { step: number; message: string } | null => {
    if (targetStep >= 2) {
      const msg = validateAccount();
      if (msg) return { step: 1, message: msg };
    }
    if (targetStep >= 3) {
      const msg = validateDetails();
      if (msg) return { step: 2, message: msg };
    }
    if (targetStep >= 4) {
      const msg = validateAcademic();
      if (msg) return { step: 3, message: msg };
    }
    if (targetStep >= 5) {
      const msg = validateParent();
      if (msg) return { step: 4, message: msg };
    }
    return null;
  };

  const goTo = (next: number) => {
    if (next > step) {
      const blocked = validateUpTo(next);
      if (blocked) {
        setError(blocked.message);
        toast.error(blocked.message);
        setStep(blocked.step);
        return;
      }
    }
    setError(null);
    setStep(Math.min(Math.max(next, 1), TOTAL_STEPS));
  };

  const continueLabels: Record<number, string> = {
    1: 'Next: Details',
    2: 'Next: Academic',
    3: 'Next: Parent',
    4: 'Next: Overview',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < TOTAL_STEPS) {
      goTo(step + 1);
      return;
    }

    const blocked = validateUpTo(TOTAL_STEPS);
    if (blocked) {
      setError(blocked.message);
      toast.error(blocked.message);
      setStep(blocked.step);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_full_name: studentFullName.trim(),
          student_email: studentEmail.trim(),
          student_phone: studentPhone.trim(),
          student_password: studentPassword,
          student_address: studentAddress.trim(),
          city: city.trim() || null,
          gender: gender || null,
          date_of_birth: dateOfBirth || null,
          enrollment_date: enrollmentDate || null,
          father_name: fatherName.trim() || null,
          tazkira_number: tazkiraNumber.trim() || null,
          program_id: programId || null,
          class_id: classId || null,
          duration_months: durationMonths ? Number(durationMonths) : null,
          student_level: studentLevel.trim() || null,
          total_fees: feesNum,
          discount_percentage: discountNum,
          notes: notes.trim() || null,
          parent_full_name: parentFullName.trim(),
          parent_email: parentEmail.trim(),
          parent_phone: parentPhone.trim(),
          parent_password: parentPassword,
          parent_address: parentAddress.trim() || null,
          relationship,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create student and parent');
      const code = data.student?.student_code ? ` (${data.student.student_code})` : '';
      toast.success(
        `Created ${data.student?.full_name || 'student'}${code} with parent ${parentFullName.trim()}`
      );
      router.push('/students');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Create failed';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative -mx-1 min-h-[calc(100vh-7rem)] overflow-hidden rounded-[28px] border border-border bg-background shadow-card sm:-mx-0">
      {/* Atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(900px 420px at 12% -10%, rgba(136,182,255,0.28), transparent 60%), radial-gradient(700px 380px at 100% 0%, rgba(20,32,51,0.08), transparent 55%), linear-gradient(165deg, hsl(var(--background)) 0%, hsl(var(--muted) / 0.45) 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(136,182,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(136,182,255,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
        }}
      />

      <div className="relative grid min-h-[calc(100vh-7rem)] lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Phase rail */}
        <aside className="relative z-10 border-b border-border/70 bg-[#142033] text-white lg:border-b-0 lg:border-e lg:border-border/20">
          <div className="flex h-full flex-col p-5 sm:p-6">
            <button
              type="button"
              onClick={() => router.push('/students')}
              className="mb-5 inline-flex w-fit items-center gap-1.5 rounded-lg text-xs font-semibold text-white/65 transition hover:text-white"
            >
              <ArrowLeft size={14} />
              Students
            </button>

            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.2em] text-[#88b6ff]">
              Student Ops
            </p>
            <h1 className="m-0 mt-2 text-[1.65rem] font-bold leading-tight tracking-tight text-white">
              Create Student
              <span className="block font-semibold text-white/70">&amp; Parent</span>
            </h1>
            <p className="m-0 mt-2 text-sm leading-relaxed text-white/55">
              Five phases. Last stop is a full preview before both accounts are created.
            </p>

            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#88b6ff] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] font-medium text-white/45">
              Phase {step} of {TOTAL_STEPS} · {Math.round(progress)}%
            </p>

            {/* Mobile horizontal phases */}
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {STEPS.map((s) => {
                const active = step === s.id;
                const done = step > s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => goTo(s.id)}
                    className={cn(
                      'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                      active
                        ? 'border-[#88b6ff] bg-[#88b6ff] text-[#142033]'
                        : done
                          ? 'border-white/20 bg-white/10 text-white'
                          : 'border-white/10 text-white/50'
                    )}
                  >
                    {s.id}. {s.title}
                  </button>
                );
              })}
            </div>

            {/* Desktop vertical spine */}
            <nav className="mt-8 hidden flex-1 lg:block" aria-label="Registration phases">
              <ol className="relative m-0 space-y-0 p-0 list-none">
                <div
                  aria-hidden
                  className="absolute start-[15px] top-3 bottom-3 w-px bg-white/15"
                />
                {STEPS.map((s) => {
                  const Icon = s.icon;
                  const active = step === s.id;
                  const done = step > s.id;
                  return (
                    <li key={s.id} className="relative">
                      <button
                        type="button"
                        onClick={() => goTo(s.id)}
                        className={cn(
                          'group flex w-full items-start gap-3 rounded-2xl px-1 py-2.5 text-start transition',
                          active && 'bg-white/5'
                        )}
                      >
                        <span
                          className={cn(
                            'relative z-[1] mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition',
                            active
                              ? 'border-[#88b6ff] bg-[#88b6ff] text-[#142033] shadow-[0_0_0_4px_rgba(136,182,255,0.25)]'
                              : done
                                ? 'border-emerald-400/50 bg-emerald-400/20 text-emerald-200'
                                : 'border-white/20 bg-[#142033] text-white/45'
                          )}
                        >
                          {done ? <Check size={14} strokeWidth={3} /> : s.id}
                        </span>
                        <span className="min-w-0 pt-0.5">
                          <span
                            className={cn(
                              'block text-sm font-semibold',
                              active ? 'text-white' : done ? 'text-white/80' : 'text-white/45'
                            )}
                          >
                            {s.title}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-white/40">
                            <Icon size={12} className={active ? 'text-[#88b6ff]' : undefined} />
                            {s.hint}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>
        </aside>

        {/* Main stage */}
        <main className="relative z-10 flex min-w-0 flex-col">
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="relative flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
              <div
                aria-hidden
                className="pointer-events-none absolute end-4 top-2 select-none font-black leading-none text-[7.5rem] tracking-tighter text-foreground/[0.04] sm:end-8 sm:text-[9rem]"
              >
                {String(step).padStart(2, '0')}
              </div>

              <div
                className={cn(
                  'relative mx-auto w-full max-w-2xl transition-all duration-300 ease-out',
                  entered ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                )}
              >
                <div className="mb-6 flex items-start gap-4">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#88b6ff]/40 bg-[#88b6ff]/15 text-[#142033] dark:text-[#88b6ff]">
                    <CurrentIcon size={22} />
                  </span>
                  <div className="min-w-0">
                    <p className="m-0 text-[11px] font-bold uppercase tracking-[0.18em] text-[#5b86c7]">
                      Phase {step} · {current.hint}
                    </p>
                    <h2 className="m-0 mt-1 text-2xl font-bold tracking-tight text-foreground">
                      {current.title}
                    </h2>
                    <p className="m-0 mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                      {current.blurb}
                    </p>
                  </div>
                </div>

                {error ? (
                  <div className="mb-5">
                    <ErrorBanner message={error} />
                  </div>
                ) : null}

                {step === 1 ? (
                  <div className="grid gap-4 rounded-3xl border border-border/80 bg-card/90 p-4 shadow-soft backdrop-blur-sm sm:grid-cols-2 sm:p-6">
                    <InputField
                      label="Full name"
                      required
                      value={studentFullName}
                      onChange={(e) => setStudentFullName(e.target.value)}
                      placeholder="Student full name"
                      containerClassName="sm:col-span-2"
                    />
                    <InputField
                      label="Email"
                      type="email"
                      required
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      placeholder="student@institute.com"
                    />
                    <InputField
                      label="Phone"
                      required
                      value={studentPhone}
                      onChange={(e) => setStudentPhone(e.target.value)}
                      placeholder="+93…"
                    />
                    <PasswordField
                      label="Password"
                      required
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                    />
                    <PasswordField
                      label="Confirm password"
                      required
                      value={studentPasswordConfirm}
                      onChange={(e) => setStudentPasswordConfirm(e.target.value)}
                      placeholder="Repeat password"
                    />
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="grid gap-4 rounded-3xl border border-border/80 bg-card/90 p-4 shadow-soft backdrop-blur-sm sm:grid-cols-2 sm:p-6">
                    <Dropdown
                      label="Gender"
                      value={gender}
                      onChange={setGender}
                      options={GENDER_OPTIONS}
                      placeholder="Select gender"
                      required
                    />
                    <InputField
                      label="Date of birth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                    <InputField
                      label="Father name"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      placeholder="Father's name"
                    />
                    <InputField
                      label="Tazkira number"
                      value={tazkiraNumber}
                      onChange={(e) => setTazkiraNumber(e.target.value)}
                      placeholder="National ID"
                    />
                    <InputField
                      label="Enrollment date"
                      type="date"
                      value={enrollmentDate}
                      onChange={(e) => setEnrollmentDate(e.target.value)}
                    />
                    <InputField
                      label="City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                    />
                    <div className="sm:col-span-2">
                      <TextAreaField
                        label="Address"
                        value={studentAddress}
                        onChange={(e) => setStudentAddress(e.target.value)}
                        placeholder="Home address"
                        rows={3}
                      />
                    </div>
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="grid gap-4 rounded-3xl border border-border/80 bg-card/90 p-4 shadow-soft backdrop-blur-sm sm:grid-cols-2 sm:p-6">
                    <Dropdown
                      label="Program"
                      value={programId}
                      onChange={setProgramId}
                      options={programOptions}
                      placeholder={
                        programOptions.length
                          ? 'Select program'
                          : 'No programs — add in Portable → Program'
                      }
                      required
                      hint="Managed in Portable → Program"
                    />
                    <Dropdown
                      label="Class"
                      value={classId}
                      onChange={setClassId}
                      options={classOptions}
                      placeholder={
                        classOptions.length
                          ? 'Select class'
                          : 'No classes — add in Portable → Class'
                      }
                      clearable
                      hint="Managed in Portable → Class"
                    />
                    <Dropdown
                      label="Duration"
                      value={durationMonths}
                      onChange={setDurationMonths}
                      options={durationOptions}
                      placeholder={
                        durationOptions.length
                          ? 'Select duration'
                          : 'No durations — add in Portable → Duration'
                      }
                      required
                      hint="Managed in Portable → Duration"
                    />
                    <Dropdown
                      label="Student level"
                      value={studentLevel}
                      onChange={setStudentLevel}
                      options={levelOptions}
                      placeholder={
                        levelOptions.length
                          ? 'Select level'
                          : 'No levels — add in Portable → Student Level'
                      }
                      clearable
                      hint="Managed in Portable → Student Level"
                    />
                    <InputField
                      label="Total fees"
                      type="number"
                      value={totalFees}
                      onChange={(e) => setTotalFees(e.target.value)}
                      placeholder="0"
                    />
                    <InputField
                      label="Discount %"
                      type="number"
                      value={discountPercentage}
                      onChange={(e) => setDiscountPercentage(e.target.value)}
                      placeholder="0"
                    />
                    <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-2xl border border-[#88b6ff]/35 bg-gradient-to-r from-[#88b6ff]/15 to-transparent px-4 py-3.5">
                      <div>
                        <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          Net amount
                        </p>
                        <p className="m-0 text-xs text-muted-foreground">After discount</p>
                      </div>
                      <p className="m-0 text-2xl font-bold tracking-tight text-foreground">
                        ${netAmount.toFixed(2)}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <TextAreaField
                        label="Notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Optional notes"
                        rows={3}
                      />
                    </div>
                  </div>
                ) : null}

                {step === 4 ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[#88b6ff]/30 bg-[#88b6ff]/10 px-4 py-3 text-sm text-foreground">
                      Guardian login will be created with role{' '}
                      <span className="font-semibold">guardian</span> and linked through{' '}
                      <span className="font-semibold">parent_students</span>.
                    </div>
                    <div className="grid gap-4 rounded-3xl border border-border/80 bg-card/90 p-4 shadow-soft backdrop-blur-sm sm:grid-cols-2 sm:p-6">
                      <InputField
                        label="Full name"
                        required
                        value={parentFullName}
                        onChange={(e) => setParentFullName(e.target.value)}
                        placeholder="Parent full name"
                        containerClassName="sm:col-span-2"
                      />
                      <InputField
                        label="Email"
                        type="email"
                        required
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        placeholder="parent@email.com"
                      />
                      <InputField
                        label="Phone"
                        required
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        placeholder="+93…"
                      />
                      <PasswordField
                        label="Password"
                        required
                        value={parentPassword}
                        onChange={(e) => setParentPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                      />
                      <PasswordField
                        label="Confirm password"
                        required
                        value={parentPasswordConfirm}
                        onChange={(e) => setParentPasswordConfirm(e.target.value)}
                        placeholder="Repeat password"
                      />
                      <Dropdown
                        label="Relationship"
                        value={relationship}
                        onChange={setRelationship}
                        options={RELATIONSHIP_OPTIONS}
                        placeholder="Select relationship"
                        required
                      />
                      <div className="sm:col-span-2">
                        <TextAreaField
                          label="Address"
                          value={parentAddress}
                          onChange={(e) => setParentAddress(e.target.value)}
                          placeholder="Parent address"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {step === 5 ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-dashed border-[#88b6ff]/50 bg-[#88b6ff]/8 px-4 py-3 text-sm text-muted-foreground">
                      This is a preview only. Nothing is saved until you confirm create below.
                    </div>
                    <OverviewBlock phase="01" title="Student account" onEdit={() => goTo(1)}>
                      <OverviewRow label="Full name" value={studentFullName} />
                      <OverviewRow label="Email" value={studentEmail} />
                      <OverviewRow label="Phone" value={studentPhone} />
                      <OverviewRow label="Password" value={maskSecret(studentPassword)} />
                    </OverviewBlock>
                    <OverviewBlock phase="02" title="Personal details" onEdit={() => goTo(2)}>
                      <OverviewRow label="Gender" value={labelOf(GENDER_OPTIONS, gender)} />
                      <OverviewRow label="Date of birth" value={dateOfBirth} />
                      <OverviewRow label="Father name" value={fatherName} />
                      <OverviewRow label="Tazkira" value={tazkiraNumber} />
                      <OverviewRow label="Enrollment" value={enrollmentDate} />
                      <OverviewRow label="City" value={city} />
                      <OverviewRow label="Address" value={studentAddress} />
                    </OverviewBlock>
                    <OverviewBlock phase="03" title="Academic & fees" onEdit={() => goTo(3)}>
                      <OverviewRow label="Program" value={labelOf(programOptions, programId)} />
                      <OverviewRow label="Class" value={labelOf(classOptions, classId)} />
                      <OverviewRow label="Duration" value={labelOf(durationOptions, durationMonths)} />
                      <OverviewRow label="Level" value={labelOf(levelOptions, studentLevel)} />
                      <OverviewRow label="Total fees" value={`$${feesNum.toFixed(2)}`} />
                      <OverviewRow label="Discount" value={`${discountNum}%`} />
                      <OverviewRow label="Net amount" value={`$${netAmount.toFixed(2)}`} />
                      <OverviewRow label="Notes" value={notes} />
                    </OverviewBlock>
                    <OverviewBlock phase="04" title="Parent / guardian" onEdit={() => goTo(4)}>
                      <OverviewRow label="Full name" value={parentFullName} />
                      <OverviewRow label="Email" value={parentEmail} />
                      <OverviewRow label="Phone" value={parentPhone} />
                      <OverviewRow
                        label="Relationship"
                        value={labelOf(RELATIONSHIP_OPTIONS, relationship)}
                      />
                      <OverviewRow label="Address" value={parentAddress} />
                      <OverviewRow label="Password" value={maskSecret(parentPassword)} />
                    </OverviewBlock>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Sticky footer actions */}
            <div className="sticky bottom-0 z-20 border-t border-border/80 bg-card/90 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
              <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3">
                <PortButton
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (step === 1) router.push('/students');
                    else setStep((s) => s - 1);
                  }}
                >
                  <ArrowLeft size={16} />
                  {step === 1 ? 'Cancel' : 'Back'}
                </PortButton>

                {step < TOTAL_STEPS ? (
                  <PortButton type="submit" variant="primary" className="min-w-[160px]">
                    {continueLabels[step]}
                    <ArrowRight size={16} />
                  </PortButton>
                ) : (
                  <PortButton
                    type="submit"
                    variant="primary"
                    disabled={submitting}
                    className="min-w-[200px]"
                  >
                    {submitting ? 'Creating accounts…' : 'Create student & parent'}
                  </PortButton>
                )}
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
