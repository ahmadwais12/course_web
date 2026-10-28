'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ShieldCheck,
  Users,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Briefcase,
  Menu,
  X,
  Languages,
  Smartphone,
  Activity,
  School,
  CalendarDays,
  Headphones,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import LanguageSelector from '@/components/LanguageSelector';
import ThemeToggle from '@/components/ThemeToggle';
import BrandLogo from '@/components/BrandLogo';
import Reveal from '@/components/landing/Reveal';
import { createClient } from '@/lib/supabase/client';
import { APP_NAME } from '@/lib/branding';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  { icon: Smartphone, label: 'Web & mobile app' },
  { icon: Activity, label: 'Real-time analytics' },
];

/** Public landing — logged-in users soft-redirect to /dashboard */
export default function LandingPageClient() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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

  const goTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!mounted || checking) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-background text-foreground"
        suppressHydrationWarning
      >
        Loading...
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="min-h-screen bg-background text-foreground font-sans selection:bg-accent"
    >
      <nav
        className={cn(
          'fixed top-0 w-full z-50 border-b border-border transition-all duration-300',
          scrolled
            ? 'bg-card/95 backdrop-blur-xl shadow-sm'
            : 'bg-card/70 backdrop-blur-md'
        )}
      >
        <div
          className={cn(
            'max-w-7xl mx-auto px-6 flex items-center justify-between transition-all duration-300',
            scrolled ? 'h-16' : 'h-20'
          )}
        >
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3"
            aria-label={`${APP_NAME} home`}
          >
            <BrandLogo size={scrolled ? 32 : 40} showName={false} />
            <span className="text-xl font-black tracking-tight text-foreground">{APP_NAME}</span>
          </button>

          <div className="hidden md:flex items-center gap-8">
            <ThemeToggle />
            <LanguageSelector currentLang={lang} onLanguageChange={setLang} variant="filled" />
            <button
              type="button"
              onClick={() => goTo('features')}
              className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => goTo('modules')}
              className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
            >
              Modules
            </button>
            <Link
              href="/login"
              className="px-6 py-2.5 bg-foreground text-background rounded-xl text-sm font-bold hover:opacity-90 transition-all"
            >
              Login
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="md:hidden p-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="md:hidden overflow-hidden border-t border-border bg-card/95 backdrop-blur-xl"
            >
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center justify-between">
                  <ThemeToggle />
                  <LanguageSelector
                    currentLang={lang}
                    onLanguageChange={setLang}
                    variant="filled"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => goTo('features')}
                    className="text-left px-3 py-2.5 rounded-lg text-sm font-bold text-foreground hover:bg-muted transition-colors"
                  >
                    Features
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo('modules')}
                    className="text-left px-3 py-2.5 rounded-lg text-sm font-bold text-foreground hover:bg-muted transition-colors"
                  >
                    Modules
                  </button>
                </div>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block text-center px-6 py-3 bg-foreground text-background rounded-xl text-sm font-bold hover:opacity-90 transition-all"
                >
                  Login
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <section className="relative isolate overflow-hidden pt-40 pb-20 px-6">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 -start-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute top-40 -end-24 h-[28rem] w-[28rem] rounded-full bg-indigo-500/15 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-card/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-border shadow-xl"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-xs font-black uppercase tracking-widest mb-6">
              <CheckCircle2 size={14} />
              Next-Gen Education Management
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-foreground leading-[1.1] tracking-tight mb-8">
              Empower Your <span className="text-blue-700">Institute</span> with Intelligence.
            </h1>
            <p className="text-xl text-foreground/80 leading-relaxed mb-10 max-w-xl font-medium">
              A comprehensive Education Management Information System designed to streamline
              administration, enhance teaching, and accelerate student success.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/login"
                className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold hover:opacity-90 transition-all shadow-2xl flex items-center gap-2 group"
              >
                Sign in to {APP_NAME}
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                type="button"
                onClick={() => goTo('features')}
                className="px-8 py-4 bg-card/80 backdrop-blur-sm border border-border text-foreground/80 rounded-2xl font-bold hover:bg-card transition-all"
              >
                Explore Features
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[2.5rem] blur-2xl opacity-20 animate-pulse" />
            <div className="relative bg-card rounded-[2.5rem] border border-border shadow-2xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=1200"
                alt="Educators collaborating with an education management dashboard"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </div>
          </motion.div>
        </div>

        <Reveal className="max-w-7xl mx-auto mt-16" delay={0.1}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {highlights.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 backdrop-blur-sm px-4 py-3"
              >
                <item.icon size={18} className="text-primary shrink-0" />
                <span className="text-sm font-semibold text-foreground/80">{item.label}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section id="features" className="scroll-mt-24 py-24 bg-card/30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl font-black text-foreground mb-6">
              Everything you need to run your institute.
            </h2>
            <p className="text-lg text-foreground/80 font-medium">
              Powerful tools for every stakeholder in your educational ecosystem.
            </p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 0.06} amount={0.15}>
                <div className="h-full p-8 rounded-3xl bg-card/60 backdrop-blur-sm border border-border hover:border-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all group">
                  <div
                    className={cn(
                      'w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-white shadow-lg',
                      feature.gradient
                    )}
                  >
                    <feature.icon size={28} />
                  </div>
                  <h3 className="text-xl font-black text-foreground mb-4">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed font-medium">
                    {feature.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="modules" className="scroll-mt-24 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-black text-foreground mb-6">
              One platform, every campus operation.
            </h2>
            <p className="text-lg text-foreground/80 font-medium">
              Purpose-built modules that share the same students, staff, and records.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((mod, i) => (
              <Reveal key={mod.title} delay={i * 0.05} amount={0.15}>
                <div className="h-full rounded-3xl border border-border bg-card p-7 hover:shadow-lg hover:-translate-y-1 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                    <mod.icon size={24} />
                  </div>
                  <h3 className="text-lg font-black text-foreground mb-2">{mod.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                    {mod.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="auth-section" className="py-24 px-6">
        <Reveal className="max-w-3xl mx-auto text-center bg-card border border-border rounded-[2.5rem] p-10 sm:p-14 shadow-sm">
          <BrandLogo size={96} showName={false} />
          <h2 className="mt-4 text-3xl font-black tracking-tight text-foreground">{APP_NAME}</h2>
          <p className="mt-4 text-lg text-muted-foreground font-medium">
            Sign in with your {APP_NAME} account to open the management panels.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 mt-8 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-black hover:opacity-90 transition-all"
          >
            Go to Login
            <ArrowRight size={20} />
          </Link>
        </Reveal>
      </section>

      <footer className="py-12 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <BrandLogo size={32} showName={false} />
            <span className="font-black text-foreground">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => goTo('features')}
              className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => goTo('modules')}
              className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              Modules
            </button>
            <Link
              href="/login"
              className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              Login
            </Link>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
        </div>
      </footer>
    </motion.div>
  );
}
