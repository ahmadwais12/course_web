'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import BrandLogo from '@/components/BrandLogo';
import LanguageSelector from '@/components/LanguageSelector';
import ThemeToggle from '@/components/ThemeToggle';
import { APP_NAME } from '@/lib/branding';
import { useLanguage } from '@/context/LanguageContext';

const LINKS = [
  { href: '/#features', label: 'Features', hash: 'features' },
  { href: '/#modules', label: 'Modules', hash: 'modules' },
  { href: '/docs', label: 'Docs' },
  { href: '/download', label: 'Download' },
  { href: '/about', label: 'About' },
] as const;

type MarketingNavProps = {
  onHashNavigate?: (id: string) => void;
};

export default function MarketingNav({ onHashNavigate }: MarketingNavProps) {
  const pathname = usePathname() || '/';
  const { lang, setLang, isRTL } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [lang, pathname]);

  const goHash = (id: string) => {
    setMenuOpen(false);
    if (onHashNavigate) {
      onHashNavigate(id);
      return;
    }
    if (pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    window.location.href = `/#${id}`;
  };

  const linkClass = (active: boolean) =>
    cn(
      'text-sm font-bold transition-colors duration-200',
      active ? 'text-primary' : 'text-muted-foreground hover:text-primary'
    );

  const navLinks = (
    <>
      {LINKS.map((link) =>
        'hash' in link && link.hash ? (
          <button
            key={link.label}
            type="button"
            onClick={() => goHash(link.hash)}
            className={linkClass(false)}
          >
            {link.label}
          </button>
        ) : (
          <Link key={link.label} href={link.href} className={linkClass(pathname === link.href)}>
            {link.label}
          </Link>
        )
      )}
    </>
  );

  return (
    <nav
      dir={isRTL ? 'rtl' : 'ltr'}
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b border-border transition-all duration-300',
        scrolled ? 'bg-card/95 shadow-sm backdrop-blur-xl' : 'bg-card/70 backdrop-blur-md'
      )}
    >
      <div
        className={cn(
          'mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 transition-all duration-300',
          scrolled ? 'h-16' : 'h-20'
        )}
      >
        {/* Brand + links stay together on the start side (left in LTR, right in RTL) */}
        <div className="flex min-w-0 items-center gap-5 lg:gap-8">
          <Link
            href="/"
            className="flex min-w-0 shrink-0 items-center gap-3"
            aria-label={`${APP_NAME} home`}
          >
            <BrandLogo size={scrolled ? 40 : 52} showName={false} />
            <span className="emis-text-brand truncate text-xl font-black tracking-tight">
              {APP_NAME}
            </span>
          </Link>

          <div className="hidden items-center gap-5 border-s border-border ps-5 md:flex lg:gap-6 lg:ps-6">
            {navLinks}
          </div>
        </div>

        {/* Tools stay on the end side (right in LTR, left in RTL) */}
        <div className="hidden shrink-0 items-center gap-2 md:flex lg:gap-3">
          <ThemeToggle />
          <LanguageSelector currentLang={lang} onLanguageChange={setLang} variant="filled" />
          <Link
            href="/login"
            className="emis-btn-primary rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-all lg:px-6"
          >
            Login
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="rounded-xl border border-border bg-card p-2 text-foreground transition-colors hover:bg-muted md:hidden"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border bg-card/95 backdrop-blur-xl md:hidden"
          >
            <div className="space-y-4 px-6 py-5" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className="flex items-center justify-between gap-3">
                <ThemeToggle />
                <LanguageSelector currentLang={lang} onLanguageChange={setLang} variant="filled" />
              </div>
              <div className="flex flex-col gap-1">
                {LINKS.map((link) =>
                  'hash' in link && link.hash ? (
                    <button
                      key={link.label}
                      type="button"
                      onClick={() => goHash(link.hash)}
                      className="rounded-lg px-3 py-2.5 text-start text-sm font-bold text-foreground transition-colors hover:bg-muted"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-start text-sm font-bold text-foreground transition-colors hover:bg-muted"
                    >
                      {link.label}
                    </Link>
                  )
                )}
              </div>
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="emis-btn-primary block rounded-xl px-6 py-3 text-center text-sm font-bold shadow-sm transition-all"
              >
                Login
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
