import { NextResponse } from 'next/server';
import { requireVerificationUser, stringParam, verificationError } from '@/lib/verification-api';
import { listDiscoveries } from '@/lib/verification-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  try {
    const url = new URL(request.url);
    return NextResponse.json(
      await listDiscoveries(access.access.actor, {
        status: stringParam(url, 'status'),
        session_id: stringParam(url, 'session_id'),
        q: stringParam(url, 'q'),
      })
    );
  } catch (error) {
    return verificationError(error);
  }
}
