'use client';

import Reveal from '@/components/landing/Reveal';
import MarketingPageShell from '@/components/landing/MarketingPageShell';
import { SectionPanel } from '@/components/ports';
import { APP_NAME } from '@/lib/branding';

export default function AboutPage() {
  return (
    <MarketingPageShell
      title="About DreamFlow"
      description={`${APP_NAME} helps institutes run students, staff, finance, and reporting in one calm system.`}
    >
      <Reveal>
        <SectionPanel title="Our mission">
          <p className="text-sm leading-relaxed text-foreground">
            We build software for education teams who need clear records, multilingual support, and
            tools that work on the website, mobile app, and desktop EXE.
          </p>
        </SectionPanel>
      </Reveal>
      <Reveal delay={0.08}>
        <SectionPanel title="Who it is for">
          <ul className="list-disc space-y-2 ps-5 text-sm text-foreground">
            <li>Institutes and training centers managing enrollment and attendance</li>
            <li>Administrators tracking payments, payroll, and compliance</li>
            <li>Teachers and staff who need a simple daily workspace</li>
          </ul>
        </SectionPanel>
      </Reveal>
      <Reveal delay={0.14}>
        <SectionPanel title="Contact">
          <p className="text-sm text-muted-foreground">
            Sign in from the homepage or open your business page to get started. For product
            questions, use the support tools inside your signed-in workspace.
          </p>
        </SectionPanel>
      </Reveal>
    </MarketingPageShell>
  );
}
