'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSelector from '@/components/LanguageSelector';
import { createClient } from '@/lib/supabase/client';
import { APP_NAME } from '@/lib/branding';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { BrandLoader, Dropdown, ErrorBanner, InputField, PasswordField, PortButton } from '@/components/ports';

type AuthMode = 'login' | 'signup';
type SignupRole = 'superadmin' | 'admin';

const SIGNUP_ROLES: { id: SignupRole; label: string }[] = [
  { id: 'superadmin', label: 'Super Admin' },
  { id: 'admin', label: 'Admin' },
];

function validatePassword(password: string): string | null {
  // Same rules as course_team signup_screen.dart
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const supabase = useMemo(() => createClient(), []);

  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<SignupRole>('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace('/dashboard');
        return;
      }
      setChecking(false);
    };
    check();
  }, [router, supabase]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setSuccess(null);
  };

  const signIn = async () => {
    const trimmedEmail = email.trim();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    if (authError) {
      void fetch('/api/users/login-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'failed_login',
          email: trimmedEmail,
          details: { source: 'login_form', message: authError.message },
        }),
      });
      throw authError;
    }

    await fetch('/api/auth/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record_login: true }),
    });

    router.replace('/dashboard');
  };

  /** Matches course_team `SignupScreen._signUp` (+ optional profiles row like registration). */
  const signUp = async () => {
    if (fullName.trim().length < 3) {
      throw new Error('Full name must be at least 3 characters');
    }
    const passwordError = validatePassword(password);
    if (passwordError) throw new Error(passwordError);

    // Map web role ids to course_team profile role values
    const profileRole = role === 'superadmin' ? 'super_admin' : 'admin';

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role,
        },
      },
    });
    if (authError) throw authError;

    const user = data.user;
    if (user) {
      // Same pattern as course_team registration / account creation
      const { error: profileError } = await supabase.from('users').insert({
        id: user.id,
        full_name: fullName.trim(),
        email: email.trim(),
        role: profileRole,
        is_active: true,
        created_at: new Date().toISOString(),
      });
      // Ignore duplicate/profile-policy failures; auth user is already created
      if (profileError && !profileError.message.toLowerCase().includes('duplicate')) {
        console.warn('Profile insert skipped:', profileError.message);
      }

      if (data.session) {
        await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    setSuccess('Account created successfully. You can now sign in.');
    toast.success('Account created successfully');
    setMode('login');
    setPassword('');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp();
      } else {
        await signIn();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-background text-foreground"
        suppressHydrationWarning
      >
        <BrandLoader label="Loading…" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="login-glow" />
        <div className="login-orb login-orb--a" />
        <div className="login-orb login-orb--b" />
      </div>
      <div className="absolute top-4 end-4 z-10 flex items-center gap-2">
        <ThemeToggle />
        <LanguageSelector currentLang={lang} onLanguageChange={setLang} variant="outline" />
      </div>

      <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
        <div className="login-form-panel w-full max-w-md">
          <BrandLogo size={72} showName nameClassName="mb-1 text-4xl" />
          <p className="mb-8 text-center text-sm font-semibold text-foreground/70">
            {mode === 'login' ? `Welcome back to ${APP_NAME}` : `Create your ${APP_NAME} account`}
          </p>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>

          <div className="flex gap-2 mb-4 p-1.5 bg-muted rounded-2xl">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-black transition-all',
                mode === 'login'
                  ? 'emis-btn-primary shadow-md'
                  : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
              )}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-black transition-all',
                mode === 'signup'
                  ? 'emis-btn-primary shadow-md'
                  : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
              )}
            >
              Sign Up
            </button>
          </div>

          <form
            onSubmit={onSubmit}
            className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-5"
          >
            {mode === 'signup' && (
              <InputField
                label="Full Name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                minLength={3}
              />
            )}

            <InputField
              label="Email"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@institute.com"
            />

            {mode === 'signup' && (
              <Dropdown
                label="Role"
                required
                value={role}
                onChange={(value) => setRole(value as SignupRole)}
                options={SIGNUP_ROLES.map((r) => ({ value: r.id, label: r.label }))}
                placeholder="Select a role"
              />
            )}

            <PasswordField
              label="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={mode === 'signup' ? 8 : 6}
              hint={
                mode === 'signup'
                  ? 'Min 8 characters, 1 uppercase letter, and 1 number'
                  : undefined
              }
            />

            {error && <ErrorBanner message={error} />}
            {success && (
              <div className="rounded-lg border border-border bg-accent px-4 py-3 text-sm font-medium text-primary">
                {success}
              </div>
            )}

            <PortButton variant="primary" type="submit" disabled={loading} className="w-full">
              {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </PortButton>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="emis-text-brand font-bold hover:underline"
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="emis-text-brand font-bold hover:underline"
                >
                  Sign In
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
