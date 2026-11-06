'use client';

import Link from 'next/link';
import { Monitor, Smartphone, Globe } from 'lucide-react';
import Reveal from '@/components/landing/Reveal';
import MarketingPageShell from '@/components/landing/MarketingPageShell';
import { PortButton, SectionPanel } from '@/components/ports';
import { APP_NAME } from '@/lib/branding';

const clients = [
  {
    title: 'Website',
    desc: 'Use DreamFlow in any modern browser. No install required.',
    icon: Globe,
    action: { href: '/login', label: 'Open web app' },
  },
  {
    title: 'Mobile app',
    desc: 'Flutter mobile client for phones and tablets. Install from your internal release channel.',
    icon: Smartphone,
    action: null,
  },
  {
    title: 'Desktop app (EXE)',
    desc: 'Windows desktop client for campus labs and office PCs. Counts as Desktop EXE in System Viewer.',
    icon: Monitor,
    action: null,
  },
];

export default function DownloadPage() {
  return (
    <MarketingPageShell
      title="Download"
      description={`Get ${APP_NAME} on the clients your team uses — browser, mobile, and Windows desktop EXE.`}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {clients.map((client, index) => (
          <Reveal key={client.title} delay={index * 0.08}>
            <SectionPanel title={client.title}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <client.icon size={22} />
              </div>
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{client.desc}</p>
              {client.action ? (
                <Link href={client.action.href}>
                  <PortButton variant="primary" className="w-full">
                    {client.action.label}
                  </PortButton>
                </Link>
              ) : (
                <PortButton variant="secondary" className="w-full" disabled>
                  Release link coming soon
                </PortButton>
              )}
            </SectionPanel>
          </Reveal>
        ))}
      </div>
    </MarketingPageShell>
  );
}
