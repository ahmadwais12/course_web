import { NextResponse } from 'next/server';
import { requireVerificationUser, stringParam, verificationError } from '@/lib/verification-api';
import { verificationDashboard } from '@/lib/verification-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  try {
    const url = new URL(request.url);
    return NextResponse.json(
      await verificationDashboard(access.access.actor, {
        campaign_id: stringParam(url, 'campaign_id') ?? stringParam(url, 'campaign'),
        branch: stringParam(url, 'branch'),
        from: stringParam(url, 'from'),
        to: stringParam(url, 'to'),
      })
    );
  } catch (error) {
    return verificationError(error);
  }
}
