'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Shield, User } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSelector from '@/components/LanguageSelector';
import { createClient } from '@/lib/supabase/client';
import { APP_NAME } from '@/lib/branding';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

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
  const [obscure, setObscure] = useState(true);
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
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (authError) throw authError;

    await fetch('/api/auth/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <ThemeToggle />
        <LanguageSelector currentLang={lang} onLanguageChange={setLang} variant="outline" />
      </div>

      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <BrandLogo size={140} showName nameClassName="mb-1" />
          <p className="text-center text-sm font-semibold text-muted-foreground mb-8">
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
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
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
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
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
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                    minLength={3}
                    className="w-full pl-11 pr-4 py-3.5 bg-muted text-foreground border border-border rounded-2xl placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 focus:border-primary outline-none transition-all font-medium"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground/80 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institute.com"
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-muted text-foreground border border-border rounded-2xl placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 focus:border-primary outline-none transition-all font-medium"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 ml-1">Role</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as SignupRole)}
                    className="w-full pl-11 pr-4 py-3.5 bg-muted text-foreground border border-border rounded-2xl focus:ring-2 focus:ring-ring/20 focus:border-primary outline-none transition-all font-bold appearance-none cursor-pointer"
                  >
                    {SIGNUP_ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground/80 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type={obscure ? 'password' : 'text'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={mode === 'signup' ? 8 : 6}
                  className="w-full pl-11 pr-12 py-3.5 bg-muted text-foreground border border-border rounded-2xl placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20 focus:border-primary outline-none transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setObscure((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
                  aria-label={obscure ? 'Show password' : 'Hide password'}
                >
                  {obscure ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {mode === 'signup' && (
                <p className="text-xs text-muted-foreground ml-1">
                  Min 8 characters, 1 uppercase letter, and 1 number
                </p>
              )}
            </div>

            {error && (
              <div className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {success && (
              <div className="text-sm font-medium text-primary bg-accent border border-border rounded-xl px-4 py-3">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-2xl font-black hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading
                ? 'Please wait...'
                : mode === 'signup'
                  ? 'Create Account'
                  : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="font-bold text-primary hover:underline"
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
                  className="font-bold text-primary hover:underline"
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
