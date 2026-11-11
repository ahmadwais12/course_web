import { DEFAULT_GLOBAL_SETTINGS, loadGlobalSettings, type AIGlobalSettings } from '@/lib/ai/settings';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Guest requests do not have a user or organization. Settings still come from the database when
 * available, but a missing migration must not break the public assistant — fall back to defaults.
 */
export async function loadPublicSettings(): Promise<AIGlobalSettings> {
  try {
    return await loadGlobalSettings(createSupabaseAdminClient());
  } catch {
    return { ...DEFAULT_GLOBAL_SETTINGS };
  }
}

const WINDOW_MS = 10 * 60_000;
const MAX_REQUESTS = 20;
const buckets = new Map<string, { count: number; resetAt: number }>();

/** Neutral wording for visitors — internal configuration details stay in the admin views. */
export const PUBLIC_UNAVAILABLE_MESSAGE = 'The AI Assistant is temporarily unavailable. Please try again later.';

/** Best-effort per-IP limit for the unauthenticated endpoint (in-memory, resets on restart). */
export function takeGuestRateLimitToken(ip: string): boolean {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [key, value] of buckets) if (value.resetAt <= now) buckets.delete(key);
  }
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (bucket.count >= MAX_REQUESTS) return false;
  bucket.count += 1;
  return true;
}
