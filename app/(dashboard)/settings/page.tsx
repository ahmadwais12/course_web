'use client';

import React from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import { useTheme } from '@/context/ThemeContext';
import {
  PageHeader,
  SectionPanel,
  PortButton,
} from '@/components/ports';
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
} from 'lucide-react';

const settingsSections = [
  { id: 'profile', title: 'Profile Settings', desc: 'Manage your personal information and avatar.', icon: User },
  { id: 'notifications', title: 'Notifications', desc: 'Configure how you receive alerts and updates.', icon: Bell },
  { id: 'security', title: 'Security & Privacy', desc: 'Update password and manage two-factor authentication.', icon: Shield },
  { id: 'billing', title: 'Billing & Subscription', desc: 'Manage institute billing and payment methods.', icon: CreditCard },
  { id: 'system', title: 'System Configuration', desc: 'Global settings for courses, levels, and departments.', icon: Database },
  { id: 'localization', title: 'Localization', desc: 'Set timezones, currency, and language preferences.', icon: Globe },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="System Settings"
          description="Configure your EMIS platform preferences and security."
        />

        <SectionPanel title="Appearance" description="Light / dark theme">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              Current: <strong className="text-foreground capitalize">{theme}</strong>
            </div>
            <div className="flex items-center gap-2">
              <PortButton
                variant={theme === 'light' ? 'primary' : 'secondary'}
                onClick={() => setTheme('light')}
              >
                Light
              </PortButton>
              <PortButton
                variant={theme === 'dark' ? 'primary' : 'secondary'}
                onClick={() => setTheme('dark')}
              >
                Dark
              </PortButton>
              <ThemeToggle />
            </div>
          </div>
        </SectionPanel>

        <div className="grid gap-3">
          {settingsSections.map((section) => (
            <SectionPanel key={section.id} bodyClassName="py-3">
              <button
                type="button"
                className="w-full flex items-center gap-4 text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                  <section.icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{section.title}</p>
                  <p className="text-sm text-muted-foreground">{section.desc}</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>
            </SectionPanel>
          ))}
        </div>
      </div>
  );
}
