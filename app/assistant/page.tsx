import Link from 'next/link';
import { ArrowRight, BookOpenCheck, Languages, ShieldCheck } from 'lucide-react';
import MarketingNav from '@/components/landing/MarketingNav';
import PublicAIChat from '@/components/ai/PublicAIChat';

const highlights = [
  { icon: BookOpenCheck, label: 'Grounded in DreamFlow docs' },
  { icon: Languages, label: 'English · دری · پښتو' },
  { icon: ShieldCheck, label: 'No sign-in required' },
];

export default function AssistantPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-44 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[#88b6ff]/25 blur-3xl dark:bg-[#88b6ff]/15" />
        <div className="absolute top-1/3 -end-32 h-[26rem] w-[26rem] rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute -bottom-24 -start-32 h-[24rem] w-[24rem] rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <MarketingNav />

      <main className="mx-auto max-w-4xl px-4 pb-20 pt-28 sm:px-6 sm:pt-36">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Public preview
          </span>

          <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl">
            Meet your{' '}
            <span className="bg-gradient-to-r from-[#4f8df7] via-[#88b6ff] to-[#7c3aed] bg-clip-text text-transparent dark:from-[#8fb8ff] dark:via-[#a9cbff] dark:to-[#b8a1ff]">
              DreamFlow AI
            </span>{' '}
            assistant.
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-base font-medium text-muted-foreground sm:text-lg">
            Ask about features, setup, and navigation — answered from the official DreamFlow documentation. No
            account needed.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {highlights.map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-semibold text-foreground/80 backdrop-blur"
              >
                <item.icon size={13} className="text-primary" />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <PublicAIChat />
        </div>

        <p className="mt-6 text-center text-xs font-medium text-muted-foreground">
          Need your organization’s live data?{' '}
          <Link
            href="/login"
            className="inline-flex items-center gap-1 font-bold text-primary transition hover:underline"
          >
            Sign in
            <ArrowRight size={12} />
          </Link>{' '}
          and use the in-app assistant.
        </p>
      </main>
    </div>
  );
}
