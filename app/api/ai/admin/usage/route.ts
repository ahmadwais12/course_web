import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/ai/admin-access';
import { aiErrorResponse } from '@/lib/ai/http';
import { isUuid } from '@/lib/ai/security';
import { buildUsageReport, parseRange } from '@/lib/ai/usage-report';

export const dynamic = 'force-dynamic';

/** Platform-wide AI usage. Query: from, to (YYYY-MM-DD), organization (tenant id). */
export async function GET(request: Request) {
  try {
    const { admin } = await requirePlatformAdmin();
    const url = new URL(request.url);
    const { from, to } = parseRange(url);
    const org = url.searchParams.get('organization');
    return NextResponse.json(await buildUsageReport(admin, { from, to, organizationId: isUuid(org) ? org : null }));
  } catch (error) {
    return aiErrorResponse(error, 'ai/admin/usage');
  }
}
