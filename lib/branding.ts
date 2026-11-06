import { createClient } from '@/lib/supabase/client';

/** Same app name as course_users (`L.appName` / splash). */
export const APP_NAME = 'DreamFlow';

/** Local fallbacks (copied from course_users/assets/logo). */
export const LOCAL_LOGO = {
  light: '/logo/dreamflow-icon-black.png',
  dark: '/logo/dreamflow-icon-filled-256.png',
} as const;

/**
 * Supabase Storage branding paths (same bucket layout as course_users
 * `StorageBuckets.branding` / `branding/logos`).
 */
export const SUPABASE_LOGO_PATHS = {
  light: 'logos/dreamflow-icon-black.png',
  dark: 'logos/dreamflow-icon-filled-256.png',
} as const;

/** Build a public logo URL from the Supabase `branding` bucket. */
export function getSupabaseLogoUrl(mode: 'light' | 'dark' = 'light'): string {
  const supabase = createClient();
  const path = SUPABASE_LOGO_PATHS[mode];
  const { data } = supabase.storage.from('branding').getPublicUrl(path);
  return data.publicUrl;
}

export function getLocalLogoPath(mode: 'light' | 'dark' = 'light'): string {
  return LOCAL_LOGO[mode];
}

export type SocialPlatform = 'github' | 'linkedin' | 'youtube' | 'discord';

/** Public social profiles; override per deployment with NEXT_PUBLIC_SOCIAL_* env vars. */
export const SOCIAL_LINKS: { platform: SocialPlatform; label: string; href: string }[] = [
  {
    platform: 'github',
    label: 'GitHub',
    href: process.env.NEXT_PUBLIC_SOCIAL_GITHUB || 'https://github.com',
  },
  {
    platform: 'linkedin',
    label: 'LinkedIn',
    href: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || 'https://www.linkedin.com',
  },
  {
    platform: 'youtube',
    label: 'YouTube',
    href: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE || 'https://www.youtube.com',
  },
  {
    platform: 'discord',
    label: 'Discord',
    href: process.env.NEXT_PUBLIC_SOCIAL_DISCORD || 'https://discord.com',
  },
];
