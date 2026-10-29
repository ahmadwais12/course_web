'use client';

import React from 'react';
import { ThemeModeSwitch } from '@/components/ThemeToggle';
import { useTheme } from '@/context/ThemeContext';
import { PageHeader, SectionPanel } from '@/components/ports';
import { FadeIn } from '@/components/ui/Motion';
import {
  User,
  Bell,
  Shield,
  Database,
  Globe,
  CreditCard,
  ChevronRight,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const settingsSections = [
  { id: 'profile', title: 'Profile Settings', desc: 'Manage your personal information and avatar.', icon: User },
  { id: 'notifications', title: 'Notifications', desc: 'Configure how you receive alerts and updates.', icon: Bell },
  { id: 'security', title: 'Security & Privacy', desc: 'Update password and manage two-factor authentication.', icon: Shield },
  { id: 'billing', title: 'Billing & Subscription', desc: 'Manage institute billing and payment methods.', icon: CreditCard },
  { id: 'system', title: 'System Configuration', desc: 'Global settings for courses, levels, and departments.', icon: Database },
  { id: 'localization', title: 'Localization', desc: 'Set timezones, currency, and language preferences.', icon: Globe },
];

export default function SettingsPage() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="System Settings"
        description="Configure your EMIS platform preferences, appearance, and security."
      />

      <FadeIn>
        <SectionPanel title="Appearance" description="Choose light, dark, or follow the system theme.">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {theme === 'system' ? <Monitor size={18} /> : resolvedTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              Current: <strong className="capitalize text-foreground">{theme}</strong>
              {theme === 'system' && (
                <span className="text-xs">({resolvedTheme})</span>
              )}
            </div>
            <ThemeModeSwitch />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { id: 'light' as const, title: 'Light', preview: 'bg-[#f5f7fb]', card: 'bg-white' },
              { id: 'dark' as const, title: 'Dark', preview: 'bg-[#070b12]', card: 'bg-[#0c1220]' },
              { id: 'system' as const, title: 'System', preview: 'bg-gradient-to-br from-[#f5f7fb] to-[#070b12]', card: 'bg-muted' },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id)}
                className={cn(
                  'overflow-hidden rounded-2xl border p-2 text-left transition-all duration-200 hover:-translate-y-0.5',
                  theme === option.id
                    ? 'border-primary ring-2 ring-primary/25 shadow-sm'
                    : 'border-border hover:border-primary/40'
                )}
              >
                <div className={cn('mb-2 h-16 rounded-xl border border-border', option.preview)}>
                  <div className={cn('ml-3 mt-3 h-8 w-16 rounded-lg border border-border/60', option.card)} />
                </div>
                <p className="px-1 pb-1 text-sm font-semibold text-foreground">{option.title}</p>
              </button>
            ))}
          </div>
        </SectionPanel>
      </FadeIn>

      <div className="grid gap-3">
        {settingsSections.map((section, index) => (
          <FadeIn key={section.id} delay={index * 0.04}>
            <SectionPanel bodyClassName="py-3">
              <button type="button" className="flex w-full items-center gap-4 text-left">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <section.icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{section.title}</p>
                  <p className="text-sm text-muted-foreground">{section.desc}</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>
            </SectionPanel>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
