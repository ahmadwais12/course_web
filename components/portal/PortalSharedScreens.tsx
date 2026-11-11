'use client';

import React, { useState } from 'react';
import { Bell, Globe, KeyRound, Megaphone, Moon, Palette, Plus, Sun } from 'lucide-react';
import { PageHeader, SectionPanel, StatCard, EmptyState, PortButton, InputField, TextAreaField, FormDialog, FormDialogFooter, Dropdown, StatusChip, statusToneFromValue } from '@/components/ports';
import { ThemeModeSwitch } from '@/components/ThemeToggle';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from '@/components/ui/Toast';
import type { PortalAnnouncement } from '@/lib/portal-types';
import type { Language } from '@/lib/i18n';
import type { PortalId } from '@/lib/portals';
import { usePortalExtras } from '@/components/portal/usePortalExtras';
import { PortalError, PortalLoading, formatDate } from '@/components/portal/PortalUi';

const ACCENTS: Record<PortalId, { text: string; soft: string; border: string; solid: string }> = {
  student: {
    text: 'text-sky-600 dark:text-sky-300',
    soft: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-200 dark:border-sky-900',
    solid: 'bg-sky-600 hover:bg-sky-500',
  },
  teacher: {
    text: 'text-emerald-600 dark:text-emerald-300',
    soft: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-900',
    solid: 'bg-emerald-600 hover:bg-emerald-500',
  },
  employee: {
    text: 'text-violet-600 dark:text-violet-300',
    soft: 'bg-violet-50 dark:bg-violet-950/40',
    border: 'border-violet-200 dark:border-violet-900',
    solid: 'bg-violet-600 hover:bg-violet-500',
  },
  leave: {
    text: 'text-amber-600 dark:text-amber-300',
    soft: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-900',
    solid: 'bg-amber-600 hover:bg-amber-500',
  },
};

const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'dr', label: 'Dari', native: 'دری' },
  { code: 'ps', label: 'Pashto', native: 'پښتو' },
];

export function PortalAnnouncementsScreen({
  scope,
  title = 'Announcements',
  description = 'Notices published by your organization.',
  canCreate = false,
}: {
  scope: PortalId;
  title?: string;
  description?: string;
  canCreate?: boolean;
}) {
  const { data, loading, error, refresh } = usePortalExtras<{ announcements: PortalAnnouncement[] }>(scope);
  const [open, setOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('notice');
  const [priority, setPriority] = useState('normal');
  const [audience, setAudience] = useState('students');
  const [saving, setSaving] = useState(false);

  const accent = ACCENTS[scope];

  const reset = () => {
    setOpen(false);
    setFormTitle('');
    setContent('');
    setType('notice');
    setPriority('normal');
    setAudience('students');
  };

  const publish = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/portal/teacher/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: formTitle, content, type, priority, audience }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Announcement could not be published');
      toast.success('Announcement published');
      reset();
      refresh();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Announcement could not be published');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title={title}
        description={description}
        actions={
          canCreate ? (
            <PortButton variant="primary" onClick={() => setOpen(true)}>
              <Plus size={15} /> New announcement
            </PortButton>
          ) : undefined
        }
      />

      {loading ? (
        <PortalLoading />
      ) : error ? (
        <PortalError message={error} onRetry={refresh} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Published" value={data?.announcements.length ?? 0} accent="blue" />
            <StatCard label="Pinned" value={data?.announcements.filter((row) => row.isPinned).length ?? 0} accent="gold" />
            <StatCard label="Urgent" value={data?.announcements.filter((row) => row.priority === 'urgent' || row.priority === 'high').length ?? 0} accent="purple" />
            <StatCard label="This month" value={data?.announcements.filter((row) => (row.publishDate || '').slice(0, 7) === new Date().toISOString().slice(0, 7)).length ?? 0} accent="green" />
          </div>

          <SectionPanel title="Notice board">
            {data?.announcements.length ? (
              <ul className="space-y-3">
                {data.announcements.map((item) => (
                  <li key={item.id} className={`rounded-xl border p-3.5 ${item.isPinned ? accent.border : 'border-border'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent.soft} ${accent.text}`}>
                          <Megaphone size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDate(item.publishDate)} · {item.audience || 'all'} · {item.type || 'general'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {item.isPinned && <StatusChip label="pinned" tone="gold" />}
                        <StatusChip label={item.priority || 'normal'} tone={statusToneFromValue(item.priority || 'normal')} />
                      </div>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{item.content}</p>
                    {item.attachmentUrl && (
                      <a
                        href={item.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`mt-2 inline-block text-xs font-semibold hover:underline ${accent.text}`}
                      >
                        {item.attachmentName || 'Open attachment'}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState message="No announcements have been published yet." />
            )}
          </SectionPanel>
        </>
      )}

      {canCreate && (
        <FormDialog
          open={open}
          title="New announcement"
          onClose={reset}
          footer={
            <FormDialogFooter
              onCancel={reset}
              submitLabel="Publish"
              submitting={saving}
              formId="teacher-announcement-form"
              disabled={!formTitle.trim() || !content.trim()}
            />
          }
        >
          <form
            id="teacher-announcement-form"
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void publish();
            }}
          >
            <InputField
              label="Title"
              required
              value={formTitle}
              onChange={(event) => setFormTitle(event.target.value)}
              placeholder="Exam timetable update"
            />
            <TextAreaField
              label="Message"
              required
              rows={5}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Write the announcement…"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Dropdown
                label="Type"
                value={type}
                onChange={setType}
                options={[
                  { value: 'notice', label: 'Notice' },
                  { value: 'event', label: 'Event' },
                  { value: 'news', label: 'News' },
                  { value: 'emergency', label: 'Emergency' },
                  { value: 'achievement', label: 'Achievement' },
                  { value: 'general', label: 'General' },
                ]}
              />
              <Dropdown
                label="Priority"
                value={priority}
                onChange={setPriority}
                options={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' },
                  { value: 'low', label: 'Low' },
                ]}
              />
              <Dropdown
                label="Audience"
                value={audience}
                onChange={setAudience}
                options={[
                  { value: 'students', label: 'Students' },
                  { value: 'all', label: 'Everyone' },
                ]}
              />
            </div>
          </form>
        </FormDialog>
      )}
    </div>
  );
}

export function PortalSettingsScreen({ scope, portalName }: { scope: PortalId; portalName: string }) {
  const { theme, setTheme } = useTheme();
  const { lang, setLang } = useLanguage();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const accent = ACCENTS[scope];

  const submitPassword = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/portal/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmation }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Password update failed');
      toast.success('Password updated');
      setPassword('');
      setConfirmation('');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Password update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="Settings"
        description={`Personal preferences for your ${portalName.toLowerCase()}.`}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionPanel title="Appearance" description="Theme applies to the whole application.">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Palette size={16} className={accent.text} /> Theme mode
            </div>
            <ThemeModeSwitch />
            <div className="flex items-center gap-2 pt-2 text-[11px] text-muted-foreground">
              {theme === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
              Currently {theme}
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Language" description="Applies to navigation and labels.">
          <div className="grid gap-2 sm:grid-cols-3">
            {LANGUAGES.map((option) => {
              const active = option.code === lang;
              return (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => setLang(option.code)}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    active ? `${accent.border} ${accent.soft}` : 'border-border hover:bg-muted/60'
                  }`}
                >
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <Globe size={14} className={active ? accent.text : 'text-muted-foreground'} />
                    {option.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{option.native}</p>
                </button>
              );
            })}
          </div>
        </SectionPanel>

        <SectionPanel title="Security" description="Update the password for your account.">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submitPassword();
            }}
          >
            <InputField
              label="New password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              hint="At least 8 characters."
            />
            <InputField
              label="Confirm password"
              type="password"
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            <div className="flex justify-end">
              <PortButton
                type="submit"
                variant="primary"
                disabled={saving || !password || password !== confirmation}
              >
                <KeyRound size={14} /> {saving ? 'Updating…' : 'Update password'}
              </PortButton>
            </div>
          </form>
        </SectionPanel>

        <SectionPanel title="Notifications" description="Alerts are delivered through the shared notification centre.">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3">
              <Bell size={16} className={`mt-0.5 shrink-0 ${accent.text}`} />
              <p>
                Assignments, attendance alerts, exam results, leave decisions, and messages appear in your
                notification panel and notification history.
              </p>
            </div>
            <a
              href="/notifications"
              className={`inline-flex text-sm font-semibold hover:underline ${accent.text}`}
            >
              Open notification centre
            </a>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
