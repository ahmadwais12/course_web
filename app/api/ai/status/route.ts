import { NextResponse } from 'next/server';
import { resolveAIContext } from '@/lib/ai/context';
import { AIError, AI_ERROR_MESSAGES } from '@/lib/ai/errors';
import { aiErrorResponse } from '@/lib/ai/http';
import { isOrgAdminRole, isPlatformRole } from '@/lib/ai/modules';
import { isNearLimit, remaining } from '@/lib/ai/quota';
import { resolveAccess } from '@/lib/ai/service';
import { getSuggestions } from '@/lib/ai/suggestions';
import { getUsageCounts } from '@/lib/ai/usage';

export const dynamic = 'force-dynamic';

/** Availability, permitted modules, quota, and suggestions for the signed-in user. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const lang = url.searchParams.get('lang');
  const language = lang === 'dr' || lang === 'ps' ? lang : 'en';
  try {
    const access = await resolveAccess();
    const { ctx, admin, limits, tenantSettings, blocker } = access;
    const usage = await getUsageCounts(admin, ctx.organizationId);
    const threshold = tenantSettings?.warning_threshold ?? 0.8;
    return NextResponse.json({
      available: blocker === null,
      reason: blocker,
      message: blocker ? AI_ERROR_MESSAGES[blocker] : null,
      organization: ctx.organizationName,
      scope: ctx.scopeLabel,
      allowedModules: ctx.allowedModules,
      suggestions: blocker ? [] : getSuggestions(ctx.allowedModules, language),
      canManageOrganization: isOrgAdminRole(ctx.role) && Boolean(ctx.organizationId),
      isPlatformAdmin: isPlatformRole(ctx.role),
      usage: {
        daily: usage.daily,
        monthly: usage.monthly,
        dailyLimit: limits.daily,
        monthlyLimit: limits.monthly,
        dailyRemaining: remaining(limits.daily, usage.daily),
        monthlyRemaining: remaining(limits.monthly, usage.monthly),
        plan: limits.planSlug,
        nearLimit: isNearLimit(limits.daily, usage.daily, threshold) || isNearLimit(limits.monthly, usage.monthly, threshold),
      },
    });
  } catch (error) {
    // Configuration problems are reported as "unavailable" so the UI can hide the assistant gracefully.
    if (error instanceof AIError && error.code !== 'unauthorized' && error.code !== 'internal') {
      // Admins still need the management links (e.g. to see that the migration is missing).
      const roleFlags = await resolveAIContext()
        .then(({ ctx }) => ({
          canManageOrganization: isOrgAdminRole(ctx.role) && Boolean(ctx.organizationId),
          isPlatformAdmin: isPlatformRole(ctx.role),
        }))
        .catch(() => ({}));
      return NextResponse.json({ available: false, reason: error.code, message: error.message, suggestions: [], ...roleFlags });
    }
    return aiErrorResponse(error, 'ai/status');
  }
}
