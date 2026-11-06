'use client';

import Reveal from '@/components/landing/Reveal';
import MarketingPageShell from '@/components/landing/MarketingPageShell';
import { SectionPanel } from '@/components/ports';

const sections = [
  {
    title: 'Get started',
    body: 'Open the homepage, choose your business and program duration, then sign in. Admins can create users, roles, and permissions from Users & Security.',
  },
  {
    title: 'Businesses & branches',
    body: 'Create a central business, add branches, and share the public business URL. Visitors can open that page from the homepage dropdown.',
  },
  {
    title: 'Durations',
    body: 'Program lengths such as 4, 6, or 12 months live under Portable → Durations. Active durations appear on the public homepage.',
  },
  {
    title: 'System Viewer',
    body: 'Track website, mobile app, and desktop EXE opens. Use Visitors for session details such as browser, path, and last activity.',
  },
];

export default function DocsPage() {
  return (
    <MarketingPageShell
      title="Documentation"
      description="Short guides for running DreamFlow day to day — from the public homepage to admin panels."
    >
      {sections.map((section, index) => (
        <Reveal key={section.title} delay={index * 0.07}>
          <SectionPanel title={section.title}>
            <p className="text-sm leading-relaxed text-foreground">{section.body}</p>
          </SectionPanel>
        </Reveal>
      ))}
    </MarketingPageShell>
  );
}
