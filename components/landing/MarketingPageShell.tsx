'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import BrandLogo from '@/components/BrandLogo';
import MarketingNav from '@/components/landing/MarketingNav';
import Reveal from '@/components/landing/Reveal';
import SocialLinks from '@/components/landing/SocialLinks';
import { APP_NAME } from '@/lib/branding';
import { useLanguage } from '@/context/LanguageContext';

type MarketingPageShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

/** Shared chrome for public Docs / Download / About pages. */
export default function MarketingPageShell({
  title,
  description,
  children,
}: MarketingPageShellProps) {
  const { isRTL } = useLanguage();
  const reduceMotion = useReducedMotion();
  const enter = reduceMotion
    ? undefined
    : {
        initial: { opacity: 0, y: 16, filter: 'blur(8px)' },
        animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <motion.div {...enter}>
        <main className="mx-auto max-w-5xl px-6 pb-24 pt-32">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{APP_NAME}</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-lg font-medium text-muted-foreground">{description}</p>
          </Reveal>
          <div className="mt-12 space-y-8">{children}</div>
        </main>
        <footer className="border-t border-border bg-card py-10">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <BrandLogo size={36} showName={false} />
              <span className="font-black">{APP_NAME}</span>
            </div>
            <div className="flex flex-wrap gap-5 text-sm font-semibold text-muted-foreground">
              <Link href="/" className="hover:text-primary">
                Home
              </Link>
              <Link href="/docs" className="hover:text-primary">
                Docs
              </Link>
              <Link href="/download" className="hover:text-primary">
                Download
              </Link>
              <Link href="/about" className="hover:text-primary">
                About
              </Link>
              <Link href="/login" className="hover:text-primary">
                Login
              </Link>
              <Link href="/account-deletion" className="hover:text-primary">
                Delete account
              </Link>
            </div>
          </div>
          <div className="mt-8 flex justify-center px-6">
            <SocialLinks />
          </div>
        </footer>
      </motion.div>
    </div>
  );
}
