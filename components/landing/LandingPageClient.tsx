'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ShieldCheck,
  Users,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Briefcase,
  Languages,
  Smartphone,
  Activity,
  School,
  CalendarDays,
  Headphones,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import BrandLogo from '@/components/BrandLogo';
import MarketingNav from '@/components/landing/MarketingNav';
import Reveal from '@/components/landing/Reveal';
import SocialLinks from '@/components/landing/SocialLinks';
import { Dropdown, PortButton, SvgFrameLoader } from '@/components/ports';
import { createClient } from '@/lib/supabase/client';
import { APP_NAME } from '@/lib/branding';
import type { PublicBusinessOption } from '@/lib/public-business';
import type { PublicDurationOption } from '@/lib/public-durations';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

const features = [
  {
    title: 'Smart Attendance',
    desc: 'Automated tracking with real-time notifications for parents and staff.',
    icon: CheckCircle2,
    gradient: 'bg-gradient-to-b from-sky-400 to-sky-200',
  },
  {
    title: 'Financial Suite',
    desc: 'Comprehensive payroll, tuition tracking, and automated invoicing.',
    icon: BarChart3,
    gradient: 'bg-gradient-to-r from-sky-400 to-cyan-300',
  },
  {
    title: 'Academic Excellence',
    desc: 'Advanced grading systems, exam management, and progress analytics.',
    icon: GraduationCap,
    gradient: 'bg-gradient-to-r from-blue-100 via-blue-300 to-blue-500',
  },
  {
    title: 'Staff Management',
    desc: 'Full HR lifecycle management from recruitment to payroll.',
    icon: Briefcase,
    gradient: 'bg-gradient-to-b from-sky-400 to-sky-200',
  },
  {
    title: 'Student Portal',
    desc: 'Personalized dashboards for students to track courses and grades.',
    icon: Users,
    gradient: 'bg-gradient-to-r from-sky-400 to-cyan-300',
  },
  {
    title: 'Secure & Scalable',
    desc: 'Enterprise-grade security with role-based access control.',
    icon: ShieldCheck,
    gradient: 'bg-gradient-to-r from-blue-100 via-blue-300 to-blue-500',
  },
];

const modules = [
  {
    title: 'Student Operations',
    desc: 'Enrollment, attendance, classes, and grades in one place.',
    icon: School,
  },
  {
    title: 'Human Resources',
    desc: 'Staff directory, attendance, payroll, and recruitment.',
    icon: Briefcase,
  },
  {
    title: 'Leave & Compliance',
    desc: 'Student and employee leave routed to teachers or managers, plus document compliance.',
    icon: CalendarDays,
  },
  {
    title: 'Support & Engagement',
    desc: 'Call center requests, support tickets, messages, and social channels.',
    icon: Headphones,
  },
  {
    title: 'Finance',
    desc: 'Tuition payments and payroll tracking with clear status at a glance.',
    icon: CreditCard,
  },
  {
    title: 'Analytics & Reports',
    desc: 'Institute dashboards and website / mobile visitor insights.',
    icon: BarChart3,
  },
];

const highlights = [
  { icon: ShieldCheck, label: 'Role-based access' },
  { icon: Languages, label: 'English · دری · پښتو' },
  { icon: Smartphone, label: 'Web, mobile & desktop' },
  { icon: Activity, label: 'Real-time analytics' },
];

type LandingPageClientProps = {
  businesses: PublicBusinessOption[];
  durations: PublicDurationOption[];
};

/** Public landing — logged-in users soft-redirect to /dashboard */
export default function LandingPageClient({ businesses, durations }: LandingPageClientProps) {
  const router = useRouter();
  const { isRTL } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [businessSlug, setBusinessSlug] = useState('');
  const [durationSlug, setDurationSlug] = useState('');
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        router.replace('/dashboard');
        return;
      }
      setChecking(false);
    })();
  }, [mounted, supabase, router]);

  useEffect(() => {
    if (!businessSlug && businesses[0]) setBusinessSlug(businesses[0].slug);
  }, [businesses, businessSlug]);

  useEffect(() => {
    if (!durationSlug && durations[0]) setDurationSlug(durations[0].slug);
  }, [durations, durationSlug]);

  const goTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openSelectedBusiness = () => {
    if (!businessSlug) return;
    const params = new URLSearchParams();
    if (durationSlug) params.set('duration', durationSlug);
    const query = params.toString();
    router.push(query ? `/${businessSlug}?${query}` : `/${businessSlug}`);
  };

  if (!mounted || checking) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#070b12] text-foreground"
        suppressHydrationWarning
      >
        <SvgFrameLoader label="Loading" />
      </div>
    );
  }

  const pageEnter = reduceMotion
    ? undefined
    : {
        initial: { opacity: 0, y: 18, filter: 'blur(8px)' },
        animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
        transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-background font-sans text-foreground selection:bg-accent"
    >
      {/* Nav stays outside motion/filter so position:fixed tracks the viewport */}
      <MarketingNav onHashNavigate={goTo} />

      <motion.div {...pageEnter}>
      <section className="relative isolate overflow-hidden px-6 pb-20 pt-40">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 -start-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute top-40 -end-24 h-[28rem] w-[28rem] rounded-full bg-indigo-500/15 blur-3xl" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[2.5rem] border border-border bg-card/40 p-8 shadow-xl backdrop-blur-md"
          >
            <div className="emis-btn-primary mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest">
              <CheckCircle2 size={14} />
              Next-Gen Education Management
            </div>
            <h1 className="mb-8 text-5xl font-black leading-[1.1] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Empower Your <span className="emis-text-brand">Institute</span> with Intelligence.
            </h1>
            <p className="mb-8 max-w-xl text-xl font-medium leading-relaxed text-foreground/80">
              A comprehensive Education Management Information System designed to streamline
              administration, enhance teaching, and accelerate student success.
            </p>

            <div className="mb-8 grid gap-3 sm:grid-cols-2">
              <Dropdown
                label="Business"
                value={businessSlug}
                onChange={setBusinessSlug}
                options={businesses.map((item) => ({
                  value: item.slug,
                  label: item.plan ? `${item.name} · ${item.plan}` : item.name,
                }))}
                placeholder={businesses.length ? 'Select a business' : 'No businesses yet'}
                disabled={!businesses.length}
                hint={
                  businesses.find((item) => item.slug === businessSlug)?.tagline ||
                  'Choose an institute to open'
                }
              />
              <Dropdown
                label="Duration"
                value={durationSlug}
                onChange={setDurationSlug}
                options={durations.map((item) => ({
                  value: item.slug,
                  label: `${item.name} (${item.months} mo)`,
                }))}
                placeholder={durations.length ? 'Select a duration' : 'No durations yet'}
                disabled={!durations.length}
                hint={
                  durations.find((item) => item.slug === durationSlug)?.description ||
                  'Program length'
                }
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <PortButton
                type="button"
                variant="primary"
                className="h-12 rounded-2xl px-8"
                disabled={!businessSlug}
                onClick={openSelectedBusiness}
              >
                Open business
                <ArrowRight size={18} />
              </PortButton>
              <Link
                href="/login"
                className="emis-btn-primary group inline-flex h-12 items-center gap-2 rounded-2xl px-8 font-bold shadow-2xl transition-all"
              >
                Sign in to {APP_NAME}
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <button
                type="button"
                onClick={() => goTo('features')}
                className="h-12 rounded-2xl border border-border bg-card/80 px-8 font-bold text-foreground/80 backdrop-blur-sm transition-all hover:bg-card"
              >
                Explore Features
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="absolute -inset-4 animate-pulse rounded-[2.5rem] bg-gradient-to-tr from-blue-600 to-indigo-600 opacity-20 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=1200"
                alt="Educators collaborating with an education management dashboard"
                width={1200}
                height={800}
                className="h-auto w-full"
              />
            </div>
          </motion.div>
        </div>

        <Reveal className="mx-auto mt-16 max-w-7xl" delay={0.1}>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {highlights.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 backdrop-blur-sm"
              >
                <item.icon size={18} className="shrink-0 text-primary" />
                <span className="text-sm font-semibold text-foreground/80">{item.label}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section id="features" className="scroll-mt-24 bg-card/30 py-24 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal className="mx-auto mb-20 max-w-3xl text-center">
            <h2 className="mb-6 text-4xl font-black text-foreground">
              Everything you need to run your institute.
            </h2>
            <p className="text-lg font-medium text-foreground/80">
              Powerful tools for every stakeholder in your educational ecosystem.
            </p>
          </Reveal>
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 0.07} amount={0.15}>
                <div className="group h-full rounded-3xl border border-border bg-card/60 p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
                  <div
                    className={cn(
                      'mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110',
                      feature.gradient
                    )}
                  >
                    <feature.icon size={28} />
                  </div>
                  <h3 className="mb-4 text-xl font-black text-foreground">{feature.title}</h3>
                  <p className="font-medium leading-relaxed text-muted-foreground">{feature.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="modules" className="scroll-mt-24 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <Reveal className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="mb-6 text-4xl font-black text-foreground">
              One platform, every campus operation.
            </h2>
            <p className="text-lg font-medium text-foreground/80">
              Purpose-built modules that share the same students, staff, and records.
            </p>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((mod, i) => (
              <Reveal key={mod.title} delay={i * 0.06} amount={0.15}>
                <div className="h-full rounded-3xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <mod.icon size={24} />
                  </div>
                  <h3 className="mb-2 text-lg font-black text-foreground">{mod.title}</h3>
                  <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                    {mod.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="auth-section" className="px-6 py-24">
        <Reveal className="mx-auto max-w-3xl rounded-[2.5rem] border border-border bg-card p-10 text-center shadow-sm sm:p-14">
          <BrandLogo size={88} showName={false} />
          <h2 className="emis-text-brand mt-4 text-3xl font-black tracking-tight">{APP_NAME}</h2>
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            Sign in with your {APP_NAME} account to open the management panels.
          </p>
          <Link
            href="/login"
            className="emis-btn-primary mt-8 inline-flex items-center justify-center gap-2 rounded-2xl px-8 py-4 font-black shadow-md transition-all"
          >
            Go to Login
            <ArrowRight size={20} />
          </Link>
        </Reveal>
      </section>

      <footer className="border-t border-border bg-card py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-6 md:flex-row">
          <div className="flex items-center gap-3">
            <BrandLogo size={40} showName={false} />
            <span className="font-black text-foreground">{APP_NAME}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link
              href="/"
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              Home
            </Link>
            <button
              type="button"
              onClick={() => goTo('features')}
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              Features
            </button>
            <Link
              href="/docs"
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              Docs
            </Link>
            <Link
              href="/download"
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              Download
            </Link>
            <Link
              href="/about"
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              About
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              Login
            </Link>
            <Link
              href="/account-deletion"
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              Delete account
            </Link>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
        </div>
        <div className="mt-10 flex justify-center px-6">
          <SocialLinks />
        </div>
      </footer>
      </motion.div>

      {/* Kept outside the motion wrapper so position:fixed tracks the viewport */}
      <Link
        href="/assistant"
        aria-label="Open the AI Assistant"
        title="AI Assistant"
        className="fixed bottom-5 end-5 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-[#88b6ff] px-4 font-bold text-[#142033] shadow-lg transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden"
      >
        <Sparkles size={18} />
        <span className="hidden sm:inline">AI Assistant</span>
      </Link>
    </div>
  );
}
