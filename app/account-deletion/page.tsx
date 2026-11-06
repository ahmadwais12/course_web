'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Reveal from '@/components/landing/Reveal';
import MarketingPageShell from '@/components/landing/MarketingPageShell';
import {
  ErrorBanner,
  InputField,
  PortButton,
  SectionPanel,
  StatusChip,
  TextAreaField,
  statusToneFromValue,
} from '@/components/ports';
import { APP_NAME } from '@/lib/branding';
import {
  DELETION_SLA_DAYS,
  deletionStatusLabel,
  type DeletionRequestRow,
} from '@/lib/account-deletion';

type Account = { full_name: string | null; email: string | null; phone: string | null };

const emptyForm = { full_name: '', email: '', phone: '', reason: '', website: '' };

export default function AccountDeletionPage() {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<Account | null>(null);
  const [requests, setRequests] = useState<DeletionRequestRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/account-deletion', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load your requests');
      setAccount(data.signed_in ? (data.account as Account) : null);
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = requests.find((r) => r.status === 'pending');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!confirmed) {
      setError('Tick the box to confirm you understand the deletion is permanent.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/account-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, confirm: true, source: 'web' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send your request');
      setDone(data.message || 'Request received.');
      setForm(emptyForm);
      setConfirmed(false);
      if (account) await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your request');
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (id: string) => {
    setCancelling(id);
    setError(null);
    try {
      const res = await fetch('/api/account-deletion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'cancel' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not cancel the request');
      setDone('Your deletion request was cancelled. Your account stays active.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel the request');
    } finally {
      setCancelling(null);
    }
  };

  return (
    <MarketingPageShell
      title="Delete your account"
      description={`Ask us to delete your ${APP_NAME} account and the personal data linked to it. You can do this from the app or with the form below.`}
    >
      <Reveal>
        <SectionPanel
          title="Request account deletion"
          description={
            account
              ? 'You are signed in, so this request is for the account below.'
              : 'Use the name and email address on your account. You do not need to sign in.'
          }
        >
          {done && (
            <div
              role="status"
              className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
            >
              {done}
            </div>
          )}
          {error && (
            <div className="mb-4">
              <ErrorBanner message={error} />
            </div>
          )}

          {account && (
            <div className="mb-4 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
              <div className="font-semibold text-foreground">{account.full_name || 'Your account'}</div>
              <div className="text-muted-foreground">{account.email || 'No email on this account'}</div>
            </div>
          )}

          {account && requests.length > 0 && (
            <div className="mb-4 space-y-2">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusChip label={deletionStatusLabel(r.status)} tone={statusToneFromValue(r.status)} />
                      <span className="text-muted-foreground">
                        Sent {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {r.admin_note && <p className="mt-1 text-muted-foreground">Team note: {r.admin_note}</p>}
                  </div>
                  {r.status === 'pending' && (
                    <PortButton onClick={() => cancel(r.id)} disabled={cancelling === r.id}>
                      {cancelling === r.id ? 'Cancelling…' : 'Cancel request'}
                    </PortButton>
                  )}
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : pending ? (
            <p className="text-sm text-muted-foreground">
              Your request is waiting for review. We will finish it within {DELETION_SLA_DAYS} days.
            </p>
          ) : (
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit} noValidate>
              {!account && (
                <>
                  <InputField
                    label="Full name"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    autoComplete="name"
                    required
                  />
                  <InputField
                    label="Account email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    autoComplete="email"
                    required
                  />
                  <InputField
                    label="Phone (optional)"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    autoComplete="tel"
                  />
                </>
              )}
              <div className="sm:col-span-2">
                <TextAreaField
                  label="Reason (optional)"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={3}
                  maxLength={2000}
                />
              </div>
              <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  Website
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                  />
                </label>
              </div>
              <label className="flex items-start gap-3 text-sm text-foreground sm:col-span-2">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-border"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <span>
                  I understand my account and its personal data will be permanently deleted and cannot be
                  recovered after the request is completed.
                </span>
              </label>
              <div className="sm:col-span-2">
                <PortButton type="submit" variant="danger" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Request account deletion'}
                </PortButton>
              </div>
            </form>
          )}
          {!account && !loading && (
            <p className="mt-4 text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>{' '}
              to send the request from your account and follow its status.
            </p>
          )}
        </SectionPanel>
      </Reveal>

      <Reveal delay={0.06}>
        <SectionPanel title="Delete from the mobile app">
          <ol className="list-decimal space-y-2 ps-5 text-sm text-foreground">
            <li>Open the {APP_NAME} app and sign in.</li>
            <li>Go to Profile, then Security &amp; Privacy.</li>
            <li>Tap Delete Account and confirm.</li>
          </ol>
        </SectionPanel>
      </Reveal>

      <Reveal delay={0.1}>
        <SectionPanel title="What happens next">
          <ol className="list-decimal space-y-2 ps-5 text-sm text-foreground">
            <li>Your institute&apos;s administrators are notified and check the request.</li>
            <li>
              Within {DELETION_SLA_DAYS} days your account is closed and you can no longer sign in. Signed-in
              users can follow the status on this page.
            </li>
            <li>The account and its personal data are then permanently erased.</li>
          </ol>
        </SectionPanel>
      </Reveal>

      <Reveal delay={0.14}>
        <div className="grid gap-6 md:grid-cols-2">
          <SectionPanel title="What is deleted">
            <ul className="list-disc space-y-2 ps-5 text-sm text-foreground">
              <li>Your profile: name, email, phone, photo, and sign-in details</li>
              <li>Messages, notifications, and app preferences</li>
              <li>Login history and device information</li>
            </ul>
          </SectionPanel>
          <SectionPanel title="What may be kept">
            <ul className="list-disc space-y-2 ps-5 text-sm text-foreground">
              <li>
                Payment, invoice, and certificate records your institute must keep by law, without your
                sign-in details
              </li>
              <li>Anonymous statistics that no longer identify you</li>
            </ul>
          </SectionPanel>
        </div>
      </Reveal>
    </MarketingPageShell>
  );
}
