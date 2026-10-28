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
