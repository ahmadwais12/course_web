'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { EmptyState, ErrorBanner, PageHeader, PortButton, SectionPanel, StatusChip, statusToneFromValue } from '@/components/ports';
import { SESSION_STATUSES, labelFrom } from '@/lib/verification';
import { ProgressBar, VerificationTabs, shortDate } from './shared';

type Session = {
  id: string;
  code: string;
  campaign_name: string;
  branch_name: string;
  officer_name: string;
  status: string;
  due_at: string;
  total: number;
  verified: number;
  pending: number;
  completion: number;
};

export default function VerificationWorkspaceLandingPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/inventory/verification/sessions', { cache: 'no-store' })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load sessions');
        setSessions(body as Session[]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load sessions'))
      .finally(() => setLoading(false));
  }, []);

  const open = sessions.filter((session) => !['completed', 'cancelled'].includes(session.status));

  return (
    <div className="min-w-0 space-y-4 animate-fade-up">
      <PageHeader
        title="Physical verification workspace"
        description="Pick an open session to inspect expected assets, scan codes, and record results."
        actions={
          <PortButton variant="secondary" onClick={() => router.push('/inventory/verification/sessions')}>
            All sessions
          </PortButton>
        }
      />
      <VerificationTabs />
      {error && <ErrorBanner message={error} />}

      <SectionPanel
        title="Open sessions"
        description="Sessions you are assigned to that are still in draft, assigned, in progress, or awaiting review."
      >
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <Loader2 size={22} className="animate-spin text-muted-foreground" />
          </div>
        ) : open.length === 0 ? (
          <EmptyState message="No open sessions. Head office has not assigned an active verification session to you yet." />
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {open.map((session) => (
              <article key={session.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{session.branch_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.code} · {session.campaign_name}
                    </p>
                  </div>
                  <StatusChip
                    label={labelFrom(SESSION_STATUSES, session.status, session.status)}
                    tone={statusToneFromValue(session.status)}
                  />
                </div>
                <ProgressBar value={session.completion} />
                <p className="text-xs text-muted-foreground">
                  {session.verified}/{session.total} verified · {session.pending} pending · due {shortDate(session.due_at)}
                </p>
                <p className="text-xs text-muted-foreground">Officer: {session.officer_name || 'Unassigned'}</p>
                <PortButton
                  variant="primary"
                  onClick={() => router.push(`/inventory/verification/sessions/${session.id}`)}
                  className="mt-auto"
                >
                  Open workspace <ArrowRight size={14} />
                </PortButton>
              </article>
            ))}
          </div>
        )}
      </SectionPanel>
    </div>
  );
}
