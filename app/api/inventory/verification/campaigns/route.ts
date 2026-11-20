import { NextResponse } from 'next/server';
import { requireVerificationUser, stringParam, verificationError } from '@/lib/verification-api';
import { createCampaign, listCampaigns } from '@/lib/verification-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  try {
    const url = new URL(request.url);
    return NextResponse.json(
      await listCampaigns(access.access.actor, {
        status: stringParam(url, 'status'),
        q: stringParam(url, 'q'),
      })
    );
  } catch (error) {
    return verificationError(error);
  }
}

export async function POST(request: Request) {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  if (!access.access.actor.manager) {
    return NextResponse.json({ error: 'Head office access required' }, { status: 403 });
  }
  try {
    const body = await request.json();
    return NextResponse.json(await createCampaign(body, access.access.actor), { status: 201 });
  } catch (error) {
    return verificationError(error);
  }
}
