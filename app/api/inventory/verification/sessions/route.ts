import { NextResponse } from 'next/server';
import { requireVerificationUser, stringParam, verificationError } from '@/lib/verification-api';
import { listSessions } from '@/lib/verification-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  try {
    const url = new URL(request.url);
    return NextResponse.json(
      await listSessions(access.access.actor, {
        campaign_id: stringParam(url, 'campaign_id'),
        status: stringParam(url, 'status'),
        branch: stringParam(url, 'branch'),
        q: stringParam(url, 'q'),
      })
    );
  } catch (error) {
    return verificationError(error);
  }
}
